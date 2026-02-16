from django.urls import path
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views

urlpatterns = [
    # JWT Token endpoints (public)
    path('login/', TokenObtainPairView.as_view(permission_classes=[AllowAny]), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(permission_classes=[AllowAny]), name='token_refresh'),

    # Registration (public)
    path('register/', views.RegisterView.as_view(), name='register'),

    # Current user
    path('me/', views.me, name='auth_me'),
    path('profile/', views.update_profile, name='update_profile'),
    path('change-password/', views.change_password, name='change_password'),

    # Admin endpoints
    path('users/', views.list_users, name='list_users'),
    path('users/<int:user_id>/role/', views.update_user_role, name='update_user_role'),
]
