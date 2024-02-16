import string
import random
from datetime import datetime
from flask import Flask, g, request, jsonify
from functools import wraps
import sqlite3

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

def get_db():
    db = getattr(g, '_database', None)

    if db is None:
        db = g._database = sqlite3.connect('db/watchparty.sqlite3')
        db.row_factory = sqlite3.Row
        setattr(g, '_database', db)
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    db = get_db()
    cursor = db.execute(query, args)
    rows = cursor.fetchall()
    db.commit()
    cursor.close()
    if rows:
        if one: 
            return rows[0]
        return rows
    return None

def new_user():
    name = "Unnamed User #" + ''.join(random.choices(string.digits, k=6))
    password = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    api_key = ''.join(random.choices(string.ascii_lowercase + string.digits, k=40))
    u = query_db('insert into users (name, password, api_key) ' + 
        'values (?, ?, ?) returning id, name, password, api_key',
        (name, password, api_key),
        one=True)
    return u

# TODO: If your app sends users to any other routes, include them here.
#       (This should not be necessary).
@app.route('/')
@app.route('/profile')
@app.route('/login')
@app.route('/room')
@app.route('/room/<chat_id>')
def index(chat_id=None):
    return app.send_static_file('index.html')

@app.errorhandler(404)
def page_not_found(e):
    return app.send_static_file('404.html'), 404



# -------------------------------- API ROUTES ----------------------------------

# TODO: Create the API

@app.route('/api/signup')
def signup():
  user = new_user()
  api_key = user[3]
  username = user[1]
  return jsonify({
      'api-key': api_key, 
      'username': username
    })

@app.route('/api/login', methods=['POST'])
def login():
  username = request.headers.get('username')
  password = request.headers.get('password')

  user = query_db('SELECT * FROM users WHERE name = ?', [username])
  user_dict = dict(user[0])

  if user_dict['password'] == password:
      print('succeeded')
      return jsonify({
          'status': 'success',
          'api-key': user_dict['api_key'],
          'username': user_dict['name'],
          })
  else:
      return jsonify({
          'status': 'failed',
          })

@app.route('/api/rooms/<int:room_id>')
def get_messages(room_id):
    messages = query_db('SELECT * FROM messages WHERE room_id = ?', [room_id])
    message_dicts = []
    if messages:
        for message in messages:
            columns = message.keys()
            message_dict = {col: message[col] for col in columns}
            message_dicts.append(message_dict)
        users = query_db('SELECT * FROM users')
        user_dicts = []
        for user in users:
            columns = user.keys()
            user_dict = {col: user[col] for col in columns}
            user_dicts.append(user_dict)
            for message_dict in message_dicts:
                if message_dict['user_id'] == user_dict['id']:
                    message_dict['name'] = user_dict['name']
        return jsonify({'status': 'success', 'message_dict': message_dicts})
    else:
        return jsonify({'status': 'failed'})

@app.route('/api/roomname/<int:room_id>')
def get_room_info(room_id):
    room = query_db('SELECT * FROM rooms WHERE id = ?', [room_id])
    room_dict = dict(room)
    return room_dict

@app.route('/api/post/message', methods=['POST'])
def post_message():
    room_id = request.headers.get('room-id')
    message = request.headers.get('message')
    api_key = request.headers.get('api-key')
    user = query_db('SELECT * FROM users WHERE api_key = ?', [api_key])
    user_dict = dict(user[0])
    id = user_dict['id']
    query_db('INSERT INTO messages (user_id, room_id, body) VALUES (?, ?, ?)', [id, room_id, message])
    return jsonify({
        'message': 'success',
        'code': 200
    }), 200

@app.route('/api/update/room/name', methods=['POST'])
def update_room():
    new_room_name = request.headers.get('new-room-name')
    api_key = request.headers.get('api-key')
    room_id = request.headers.get('room-id')
    query_db('UPDATE rooms SET name = ? WHERE id = ?', [new_room_name, room_id])
    return jsonify({
        'message': 'success',
        'code': 200
    }), 200

@app.route('/api/update/username', methods=['POST'])
def update_username():
    print("updaing username")
    api_key = request.headers.get('api-key')
    new_username = request.headers.get('new-username')
    query_db('UPDATE users SET name = ? WHERE api_key = ?', [new_username, api_key])
    return jsonify({
        'message': 'success',
        'code': 200
    }), 200

@app.route('/api/update/password', methods=['POST'])
def update_password():
    api_key = request.headers.get('api-key')
    if api_key:
        new_password = request.headers.get('new-password')
        query_db('UPDATE users SET password = ? WHERE api_key = ?', [new_password, api_key])
        return jsonify({
            'message': 'success',
            'code': 200
        }), 200
    else:
        return jsonify({
            'error_message': "API Authentication failed",
            'code': 401
        }), 401

@app.route('/api/create/room', methods=['POST'])
def create_room():
    api_key = request.headers.get('api-key')
    roomname = request.headers.get('roomname')
    if api_key:
        query_db('INSERT INTO rooms (name) VALUES (?)', [roomname])
        return jsonify({
            'message': 'success',
            'code': 200
        }), 200

@app.route('/api/get/rooms')
def get_rooms():
    api_key = request.headers.get('api-key')
    rooms = query_db('SELECT * FROM rooms')
    room_dicts = []
    for room in rooms:
        columns = room.keys()
        room_dict = {col: room[col] for col in columns}
        room_dicts.append(room_dict)
    return jsonify(room_dicts)
