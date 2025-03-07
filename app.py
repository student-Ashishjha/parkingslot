from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash
import json
import os
from datetime import datetime
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# File paths
USERS_FILE = 'users.json'
SLOTS_FILE = 'slots.json'

# Initialize user data file if it doesn't exist
def init_users():
    return {
        "admin": {"password": "admin123"},
        "user": {"password": "user123"}
    }

# Initialize slots data
def init_slots():
    return {str(slot_id): {
        "status": "available",
        "user": None,
        "entry_time": None,
        "exit_time": None
    } for slot_id in range(1, 31)}

# File operations with proper error handling and debug printing
def load_data(file_path, init_function):
    print(f"Attempting to load data from {file_path}")
    try:
        if not os.path.exists(file_path):
            print(f"File {file_path} does not exist, creating...")
            data = init_function()
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=4)
            print(f"Created file with data: {data}")
            return data
        
        with open(file_path, 'r') as f:
            data = json.load(f)
            print(f"Loaded data from {file_path}: {data}")
            return data
    except Exception as e:
        print(f"Error loading data from {file_path}: {e}")
        print("Falling back to default data")
        return init_function()

def save_data(file_path, data):
    print(f"Attempting to save data to {file_path}: {data}")
    try:
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=4)
        print(f"Successfully saved data to {file_path}")
        return True
    except Exception as e:
        print(f"Error saving data to {file_path}: {e}")
        return False

# Simplified helper functions
def load_users():
    return load_data(USERS_FILE, init_users)

def load_slots():
    return load_data(SLOTS_FILE, init_slots)

def save_users(users):
    return save_data(USERS_FILE, users)

def save_slots(slots):
    return save_data(SLOTS_FILE, slots)

@app.route('/')
def index():
    if 'username' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        print(f"Login attempt - Username: {username}, Password length: {len(password)}")
        
        users = load_users()
        print(f"Available users: {list(users.keys())}")
        
        if username in users:
            stored_password = users[username]["password"]
            print(f"Found user, stored password: {stored_password}")
            if stored_password == password:
                print("Password matched!")
                session['username'] = username
                return redirect(url_for('index'))
            else:
                print(f"Password mismatch. Entered: '{password}', Stored: '{stored_password}'")
        else:
            print(f"Username '{username}' not found in user database")
        
        flash('Invalid username or password')

    return render_template('login.html')

@app.route('/reset_users', methods=['GET'])
def reset_users():
    """Debug endpoint to reset users file to defaults"""
    users = init_users()
    success = save_users(users)
    if success:
        return jsonify({"message": "Users reset successfully", "users": users})
    else:
        return jsonify({"error": "Failed to reset users"}), 500

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('login'))

@app.route('/api/slots')
def get_slots():
    if 'username' not in session:
        return jsonify({"error": "Not authenticated"}), 401
    
    slots = load_slots()
    return jsonify(slots)

@app.route('/api/book', methods=['POST'])
def book_slot():
    if 'username' not in session:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json
    slot_id = data.get('slot_id')
    
    slots = load_slots()
    
    if slot_id not in slots:
        return jsonify({"error": "Invalid slot ID"}), 400
        
    if slots[slot_id]["status"] != "available":
        return jsonify({"error": "Slot already booked"}), 400
        
    slots[slot_id].update({
        "status": "booked",
        "user": session['username'],
        "entry_time": data.get('entry_time'),
        "exit_time": data.get('exit_time')
    })
    
    if save_slots(slots):
        return jsonify({"success": True, "message": "Slot booked successfully"})
    else:
        return jsonify({"error": "Failed to save booking"}), 500

@app.route('/api/release', methods=['POST'])
def release_slot():
    if 'username' not in session:
        return jsonify({"error": "Not authenticated"}), 401

    data = request.json
    slot_id = data.get('slot_id')
    
    slots = load_slots()
    
    if slot_id not in slots:
        return jsonify({"error": "Invalid slot ID"}), 400
        
    if slots[slot_id]["user"] != session['username'] and session['username'] != "admin":
        return jsonify({"error": "You can only release your own slots"}), 403
        
    slots[slot_id].update({
        "status": "available",
        "user": None,
        "entry_time": None,
        "exit_time": None
    })
    
    if save_slots(slots):
        return jsonify({"success": True, "message": "Slot released successfully"})
    else:
        return jsonify({"error": "Failed to save release"}), 500

if __name__ == '__main__':
    # Make sure user data is initialized at startup
    users = load_users()
    if "admin" not in users or "user" not in users:
        print("Initializing default users...")
        users = init_users()
        save_users(users)
    
    app.run(debug=True)