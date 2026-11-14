from django.shortcuts import render
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
import base64
import requests 
import json

# Create your views here.
OLLAMA_API_URL = 'http://localhost:11434/api/generate'

VISION_MODEL = 'qwen3-vl:4b'


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def extract_reciept(request):
    if 'image' not in request.FILES:
        return Response({
            "error": "No image file provided",
        }, status=status.HTTP_400_BAD_REQUEST)

    image_file = request.FILES['image']
    user_text = request.data.get('text', '').strip()

    try:
        image_bytes = image_file.read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        default_instructions = """
        You are an expert at extracting information from receipts and invoices.
        First check whether the image is a receipt or not.i If not the return a JSON with
        {
            "merchant": "Invalid receipt",
        }
        Else analyze this receipt image and extract the following details in valid JSON format:
        {
            "merchant": "Store or merchant name",
            "date": "Date as string",
            "total_amount": 0.00,
            "currency": "$/EUR/etc.",
            "tax_amount": 0.00,
            "items": [
                {
                    "description": "Item description",
                    "price": 0.00
                }
            ]
        }
        """

        if user_text:
            prompt_message = f"Additional user instruction: {user_text}\nOnly output valid JSON. Do not include markdown codeblocks or conversational text."
        else:
            prompt_message = f"Extract receipt information only output valid JSON. Do not include markdown codeblocks or conversational text."

        payload = {
            "model": VISION_MODEL,
            "system": default_instructions,
            "prompt": prompt_message,
            "images": [image_base64],
            "stream": False,
            "format": "json"
        }

        try:
            ollama_response = requests.post(OLLAMA_API_URL, json=payload, timeout=120)
            if ollama_response.status_code != 200:
                return Response({
                    "error": f"Ollama server returned error: {ollama_response.text}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            result_data = ollama_response.json()
            raw_response = result_data.get('response', "{}")
            prompt_eval_count = result_data.get('prompt_eval_count', 0)
            eval_count = result_data.get('eval_count', 0)
            total_duration = result_data.get('total_duration', 0)
            load_duration = result_data.get('load_duration',0)
            prompt_eval_duration = result_data.get('promot_eval_duration',0)
            eval_duration = result_data.get('eval_duration',0)  

            print(f"\nprompt_eval_count: {prompt_eval_count}")
            print(f"eval_count: {eval_count}")
            print(f"total_duration: {total_duration/1000000000}")
            print(f"load_duration: {load_duration/1000000000}")
            print(f"prompt_eval_duration: {prompt_eval_duration/1000000000}")
            print(f"eval_duration: {eval_duration/1000000000}")  

            extracted_json = json.loads(raw_response)

            return Response({
                "status": "success",
                "data": extracted_json,
                "tokens": {
                    "prompt": prompt_eval_count,
                    "output": eval_count
                }
            }, status=status.HTTP_200_OK)

        except requests.exceptions.ConnectionError:
            return Response({
                "error": "Unable to connect to Ollama server. Make sure `ollama serve` is running."
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except json.JSONDecodeError:
            return Response({
                "error": "Failed to parse AI response as JSON",
                "raw_text": raw_response
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                "error": f"Unexpected error: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            "error": f"Unexpected error: {str(e)}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)