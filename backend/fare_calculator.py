import json
import urllib.request
import math

def calculate_carpool_cost(start_lat, start_lon, dest_lat, dest_lon, fuel_price_per_liter, vehicle_mileage_kmpl, total_passengers=2):
    """
    Calculates the prorated fuel cost for a ride using OSRM for accurate routing.
    
    Args:
        start_lat, start_lon: Coordinates of starting point.
        dest_lat, dest_lon: Coordinates of destination.
        fuel_price_per_liter: Current price of fuel (e.g., 100 INR).
        vehicle_mileage_kmpl: Vehicle's fuel efficiency (km per liter).
        total_passengers: Total people in car including driver (for splitting cost).
        
    Returns:
        Dictionary containing distance, duration, total fuel cost, and cost per person.
    """
    
    # 1. Geospatial API Call (OSRM - Open Source Routing Machine)
    # Using OSRM because it's free and reliable for this demo. 
    # In production, you might swap this URL with the Google Maps API.
    base_url = "http://router.project-osrm.org/route/v1/driving/"
    coordinates = f"{start_lon},{start_lat};{dest_lon},{dest_lat}"
    url = f"{base_url}{coordinates}?overview=false"

    try:
        with urllib.request.urlopen(url) as response:
            if response.getcode() != 200:
                raise Exception("API Request Failed")
                
            data = json.loads(response.read().decode())
            
            if data["code"] != "Ok" or not data["routes"]:
                raise Exception("No route found")

            # OSRM returns distance in meters
            distance_meters = data["routes"][0]["distance"]
            duration_seconds = data["routes"][0]["duration"]
            
            # Convert to Kilometers (and apply 1.3x Road Factor if determining 'air distance', 
            # but OSRM is already road distance, so we take it as is. 
            # However, real traffic often adds 10%, let's stick to raw data for 'Scientific' accuracy).
            distance_km = distance_meters / 1000.0
            
    except Exception as e:
        print(f"Warning: Geospatial API failed ({e}). Falling back to Haversine.")
        # Fallback: Haversine Formula
        distance_km = haversine_distance(start_lat, start_lon, dest_lat, dest_lon) * 1.3 # Road factor approximation

    # 2. Automated Fuel Cost Partitioning Mechanism
    # Fuel Required (Liters) = Distance (km) / Mileage (km/L)
    fuel_required_liters = distance_km / vehicle_mileage_kmpl
    
    # Total Trip Cost = Fuel Required * Cost per Liter
    total_trip_cost = fuel_required_liters * fuel_price_per_liter
    
    # 3. Prorate Cost Per-Capita
    # Cost per person = Total Cost / Number of people sharing
    cost_per_person = total_trip_cost / total_passengers
    
    return {
        "distance_km": round(distance_km, 2),
        "fuel_consumed_liters": round(fuel_required_liters, 2),
        "total_trip_cost": round(total_trip_cost, 2),
        "cost_per_person": round(cost_per_person, 2),
        "currency": "INR",
        "parameters": {
            "fuel_price": fuel_price_per_liter,
            "mileage": vehicle_mileage_kmpl,
            "passengers": total_passengers
        }
    }

def haversine_distance(lat1, lon1, lat2, lon2):
    """Fallback geometry calculation"""
    R = 6371  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat / 2) * math.sin(d_lat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon / 2) * math.sin(d_lon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# --- Example Usage ---
if __name__ == "__main__":
    # Example: NNRG Campus to Uppal, Hyderabad (Approx coords)
    start = (17.4447, 78.6500) 
    dest = (17.3984, 78.5583) 
    
    # Inputs: Petrol Price 110 INR, Car Mileage 15 kmpl, 2 people (Driver + 1 Rider)
    result = calculate_carpool_cost(start[0], start[1], dest[0], dest[1], 110, 15, 2)
    
    print("\n--- Uni-Pool Fare Calculation (Python Module) ---")
    print(json.dumps(result, indent=4))
