"""
One-time script to get a Spotify refresh token.

Usage:
    python backend/get_spotify_token.py

Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars
(or a .env file in the backend directory).
"""
import os
from dotenv import load_dotenv
from spotipy.oauth2 import SpotifyOAuth

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

client_id = os.getenv("SPOTIFY_CLIENT_ID", "")
client_secret = os.getenv("SPOTIFY_CLIENT_SECRET", "")

if not client_id or not client_secret:
    print("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET first.")
    raise SystemExit(1)

auth = SpotifyOAuth(
    client_id=client_id,
    client_secret=client_secret,
    redirect_uri="http://127.0.0.1:8888/callback",
    scope="user-read-currently-playing user-read-recently-played user-top-read",
    open_browser=True,
)

print("Opening browser for Spotify authorization...")
token_info = auth.get_access_token(as_dict=True)

print(f"\n✓ Your refresh token:\n\n  {token_info['refresh_token']}\n")
print("Add this as SPOTIFY_REFRESH_TOKEN in Railway.")
