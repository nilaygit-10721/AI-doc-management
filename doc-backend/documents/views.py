from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets, permissions
from .models import Document
from .serializers import DocumentSerializer
import fitz  # PyMuPDF
import google.generativeai as genai
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Document
from django.conf import settings
import requests



@api_view(['POST'])
def register(request):
    username = request.data.get('username')
    password = request.data.get('password')
    if username is None or password is None:
        return Response({'error': 'Please provide username and password'}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({'error': 'User already exists'}, status=400)
    user = User.objects.create_user(username=username, password=password)
    return Response({'message': 'User created successfully'}, status=201)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# Configure Gemini with API key from settings
genai.configure(api_key=settings.GEMINI_API_KEY)

# Utility function to extract text
def extract_text_from_pdf(path):
    text = ""
    with fitz.open(path) as doc:
        for page in doc:
            text += page.get_text()
    return text

# AI Q&A view
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask_question(request):
    import traceback
    import json

    try:
        doc_id = request.data.get('document_id')
        question = request.data.get('question')

        if not doc_id or not question:
            return Response({'error': 'Document ID and question required'}, status=400)

        # Fetch document
        try:
            document = Document.objects.get(id=doc_id, user=request.user)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found'}, status=404)

        # Extract text
        pdf_path = document.file.path
        print(f"[DEBUG] Document path: {pdf_path}")
        text = extract_text_from_pdf(pdf_path)
        print(f"[DEBUG] Extracted text: {text[:500]}...")

        # Prepare prompt
        prompt = f"{text}\n\nQuestion: {question}"
        print(f"[DEBUG] Final prompt: {prompt[:300]}...")

        # Call Gemini Flash
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={settings.GEMINI_API_KEY}"
        headers = {'Content-Type': 'application/json'}
        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ]
        }

        print("[DEBUG] Sending request to Gemini...")
        response = requests.post(url, json=payload, headers=headers)
        print(f"[DEBUG] Response status code: {response.status_code}")
        print(f"[DEBUG] Response content: {response.content.decode()}")

        if response.status_code != 200:
            return Response({
                'error': 'Gemini API failed',
                'details': response.json()
            }, status=500)

        ai_text = response.json()['candidates'][0]['content']['parts'][0]['text']
        return Response({'answer': ai_text})

    except Exception as e:
        print("🔥 [ERROR]", traceback.format_exc())
        return Response({'error': str(e)}, status=500)
