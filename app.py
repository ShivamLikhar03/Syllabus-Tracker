from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__)

# Path for storing syllabus data
DATA_FILE = 'syllabus_data.json'

# Initialize data file if it doesn't exist
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w') as f:
        json.dump([], f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/syllabus', methods=['GET'])
def get_syllabus():
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/syllabus', methods=['POST'])
def add_syllabus_item():
    try:
        item = request.json
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        
        # Generate a new ID based on the highest existing ID + 1
        new_id = 1
        if data:
            new_id = max(item.get('id', 0) for item in data) + 1
        
        item['id'] = new_id
        data.append(item)
        
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f)
        
        return jsonify(item), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/syllabus/<int:item_id>', methods=['PUT'])
def update_syllabus_item(item_id):
    try:
        updated_item = request.json
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        
        for i, item in enumerate(data):
            if item.get('id') == item_id:
                # Update only provided fields
                for key, value in updated_item.items():
                    data[i][key] = value
                break
        
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f)
        
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/syllabus/<int:item_id>', methods=['DELETE'])
def delete_syllabus_item(item_id):
    try:
        with open(DATA_FILE, 'r') as f:
            data = json.load(f)
        
        data = [item for item in data if item.get('id') != item_id]
        
        with open(DATA_FILE, 'w') as f:
            json.dump(data, f)
        
        return jsonify({"success": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 