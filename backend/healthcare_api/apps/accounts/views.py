from django.contrib.auth.models import User
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile
from .serializers import (
    RegisterSerializer,
    UserSerializer,
    ChangePasswordSerializer,
    UpdateProfileSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Get current authenticated user's details."""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """Update the authenticated user's profile."""
    serializer = UpdateProfileSerializer(
        request.user, data=request.data, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change the authenticated user's password."""
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = request.user
    if not user.check_password(serializer.validated_data['current_password']):
        return Response(
            {'current_password': ['Current password is incorrect.']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(serializer.validated_data['new_password'])
    user.save()

    # Return new tokens since password change invalidates old ones
    refresh = RefreshToken.for_user(user)
    return Response({
        'message': 'Password changed successfully.',
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_users(request):
    """List all users (admin only)."""
    if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    users = User.objects.select_related('profile').all().order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_user_role(request, user_id):
    """Update a user's role (admin only)."""
    if not hasattr(request.user, 'profile') or not request.user.profile.is_admin:
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        target_user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return Response(
            {'detail': 'User not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    role = request.data.get('role')
    if role not in dict(UserProfile.ROLE_CHOICES):
        return Response(
            {'role': ['Invalid role. Choose from: admin, basic']},
            status=status.HTTP_400_BAD_REQUEST,
        )

    profile, _ = UserProfile.objects.get_or_create(user=target_user)
    profile.role = role
    profile.save()

    return Response(UserSerializer(target_user).data)
