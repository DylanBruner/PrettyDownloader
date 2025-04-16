import os
import requests
import json
import urllib.parse

class TMDBClient:
    def __init__(self):
        self.api_key = os.environ.get('tmdb-api-key', '')
        self.base_url = "https://api.themoviedb.org/3"
        self.image_base_url = "/api/tmdb/image"  # Use our proxy route instead of direct TMDB URL
        print(f"[INFO] TMDB Client initialized with API key: {'*****' + self.api_key[-4:] if self.api_key else 'Not set'}")

    def search(self, query, page=1, media_type='all'):
        """Search for movies and TV shows on TMDB

        Args:
            query (str): The search query
            page (int, optional): Page number for results. Defaults to 1.
            media_type (str, optional): Filter by media type - 'all', 'movie', or 'tv'. Defaults to 'all'.
        """
        if not self.api_key:
            print("[ERROR] TMDB API key not set")
            return {"results": []}

        try:
            movie_results = []
            tv_results = []

            # Search for movies if media_type is 'all' or 'movie'
            if media_type in ['all', 'movie']:
                movie_endpoint = f"{self.base_url}/search/movie?api_key={self.api_key}&query={urllib.parse.quote(query)}&page={page}"
                print(f"[INFO] Searching TMDB movies with endpoint: {movie_endpoint.replace(self.api_key, '*****')}")
                movie_response = requests.get(movie_endpoint)
                movie_response.raise_for_status()
                movie_results = movie_response.json().get('results', [])
                print(f"[INFO] Found {len(movie_results)} movie results")

                # Add media_type to movie results
                for result in movie_results:
                    result['media_type'] = 'movie'

            # Search for TV shows if media_type is 'all' or 'tv'
            if media_type in ['all', 'tv']:
                tv_endpoint = f"{self.base_url}/search/tv?api_key={self.api_key}&query={urllib.parse.quote(query)}&page={page}"
                print(f"[INFO] Searching TMDB TV shows with endpoint: {tv_endpoint.replace(self.api_key, '*****')}")
                tv_response = requests.get(tv_endpoint)
                tv_response.raise_for_status()
                tv_results = tv_response.json().get('results', [])
                print(f"[INFO] Found {len(tv_results)} TV show results")

                # Add media_type to TV results
                for result in tv_results:
                    result['media_type'] = 'tv'
                    # Rename name to title for consistency
                    if 'name' in result:
                        result['title'] = result['name']

            # Combine and sort results by popularity
            combined_results = movie_results + tv_results
            combined_results.sort(key=lambda x: x.get('popularity', 0), reverse=True)

            # Process results to add image URLs and format data
            processed_results = []
            for result in combined_results:
                # Skip items without a title or with adult content
                if not result.get('title') or result.get('adult', False):
                    continue

                # Add full image URLs
                if result.get('poster_path'):
                    result['poster_url'] = f"{self.image_base_url}{result['poster_path']}"
                    result['has_poster'] = True
                    print(f"[DEBUG] Poster URL for {result.get('title')}: {result['poster_url']}")
                else:
                    result['poster_url'] = ''
                    result['has_poster'] = False
                    print(f"[DEBUG] No poster for {result.get('title')}")

                if result.get('backdrop_path'):
                    result['backdrop_url'] = f"{self.image_base_url}{result['backdrop_path']}"

                # Add year from release_date or first_air_date
                year = None
                if result.get('release_date') and len(result['release_date']) >= 4:
                    year = result['release_date'][:4]
                elif result.get('first_air_date') and len(result['first_air_date']) >= 4:
                    year = result['first_air_date'][:4]
                result['year'] = year

                processed_results.append(result)

            return {"results": processed_results}
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] TMDB search error: {e}")
            return {"results": []}

    def get_details(self, media_id, media_type):
        """Get detailed information for a movie or TV show"""
        if not self.api_key:
            print("[ERROR] TMDB API key not set")
            return None

        try:
            # Get details based on media type
            endpoint = f"{self.base_url}/{media_type}/{media_id}?api_key={self.api_key}&append_to_response=credits,videos"
            response = requests.get(endpoint)
            response.raise_for_status()
            details = response.json()

            # Process details
            if media_type == 'tv':
                # Rename fields for consistency
                details['title'] = details.get('name', '')
                details['release_date'] = details.get('first_air_date', '')

            # Add full image URLs
            if details.get('poster_path'):
                details['poster_url'] = f"{self.image_base_url}{details['poster_path']}"
                details['has_poster'] = True
            else:
                details['poster_url'] = ''
                details['has_poster'] = False

            if details.get('backdrop_path'):
                details['backdrop_url'] = f"{self.image_base_url}{details['backdrop_path']}"

            # Extract year
            year = None
            if details.get('release_date') and len(details['release_date']) >= 4:
                year = details['release_date'][:4]
            elif details.get('first_air_date') and len(details['first_air_date']) >= 4:
                year = details['first_air_date'][:4]
            details['year'] = year

            # Extract director (for movies) or creators (for TV)
            if media_type == 'movie' and 'credits' in details:
                directors = [person for person in details.get('credits', {}).get('crew', []) if person.get('job') == 'Director']
                details['directors'] = directors[:2]  # Limit to first 2 directors
            elif media_type == 'tv':
                details['creators'] = details.get('created_by', [])[:2]  # Limit to first 2 creators

            # Extract top cast members
            if 'credits' in details:
                details['cast'] = details.get('credits', {}).get('cast', [])[:5]  # Limit to first 5 cast members

            # Extract trailer
            if 'videos' in details:
                trailers = [video for video in details.get('videos', {}).get('results', [])
                           if video.get('type') == 'Trailer' and video.get('site') == 'YouTube']
                if trailers:
                    details['trailer'] = trailers[0]

            return details
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] TMDB details error: {e}")
            return None
