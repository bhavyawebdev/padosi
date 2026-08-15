from fastapi import APIRouter

from app.api.v1 import admin, auth, chat, directory, feed, localities, map as map_router, messages, requests, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(localities.router, prefix="/localities", tags=["localities"])
api_router.include_router(feed.router, prefix="/feed", tags=["feed"])
api_router.include_router(directory.router, prefix="/directory", tags=["directory"])
api_router.include_router(requests.router, prefix="/requests", tags=["requests"])
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])
api_router.include_router(map_router.router, prefix="/map", tags=["map"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
