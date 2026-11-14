from django.urls import path
from .views import extract_reciept

urlpatterns = [
    path('extract/', extract_reciept, name='extract_reciept'),
]