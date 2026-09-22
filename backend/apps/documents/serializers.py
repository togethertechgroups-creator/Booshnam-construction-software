from rest_framework import serializers
from .models import DocumentFolder, ProjectDocument

class DocumentFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentFolder
        fields = ["id", "project", "name", "parent"]


class ProjectDocumentSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        model = ProjectDocument
        fields = [
            "id", "project", "project_name", "folder", "title",
            "category", "file", "version", "file_size_kb",
            "uploaded_by", "uploaded_by_name", "created_at"
        ]
