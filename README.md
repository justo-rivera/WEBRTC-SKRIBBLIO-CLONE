### Dibujio

choose a word, draw! peers have to guess it

## User Stories

A user creates a room and shares the link with their friends. Every 30 seconds a leader of the room is chosen, he selects a word and has the ability to draw on the canvas. What he draws is seen by the rest of the room, they can use the chat to try to guess the word.

-  **404:** Room doesn't exist, do you want to create it?
-  **Signup:** create your account
-  **Login:** login to create/join rooms
-  **Logout:** end your session
-  **Create room** input the name of your room and select the type (guess the word, draw together, annotate image)
-  **Join room** as a user i get an invite to '/roomName' where i can join other people and play 


## Backlog

User profile:
- see past games with a snapshot of words and final drawing

Different type of rooms:
- collaborative drawing, annotate an image, draw with voice chat...
  
# Client

## Routes

- / - List of public rooms (Homepage)
- /auth/signup - Signup form
- /auth/login - Login form
- /ROOM-NAME - Join 'ROOM-NAME' room
- /new - Create a new room
- /profile/me - my details and past games
- 404

## Pages

- Home Page (public)
- Sign up Page (anon only)
- Log in Page (anon only)
- Create room (user only)
- Room (public?)
- 404 Page (public)

## Components

- App
    - Initialize sockets and states
- Room 
    - Join a room, connect to the peers
    - Children: Canvas, Chat
- Canvas
    - Draw and display peers' drawings
    - Main feature of the project
- Chat
    - Communicate with your room

## IO


## Services

- Auth Service
  - auth.login(user)
  - auth.signup(user)
  - auth.logout()
  - auth.me()
  - auth.getUser() // synchronous
- Socket/Room Service
  - room.start()
  - room.create(room-name)
  - room.changeLeader(room-name)
  - room.save(room-name)

# Server

## Models

User model

```
username - String // required
email - String // required & unique
password - String // required
pastGames - [ObjectID<Game>]
```

Game model

```
snapshots - [{imageUrl, word, drawedBy}]
```

Client model

```
name - String
room - ObjectID<Room>
socket - String
user - ObjectID<User>
```

Room model

``` 
name - String
isPlaying - Boolean
clients - [ObjectID<Client>]
leader - [ObjectID<Client>]
```

## API Endpoints/Backend Routes

- GET /auth/me
- POST /auth/signup
  - body:
    - username
    - email
    - password
- POST /auth/login
  - body:
    - username
    - password
- POST /auth/logout
  - body: (empty)
- GET /:room-name
  - body:
    - who is drawing
    - time left
    - canvas
    - chat
- GET /
  - body:
    - room list
    - create a room

  

## Links

### Trello

[Link to your trello board](https://trello.com/b/gb2DdpJV/dibujio) or picture of your physical board

### Git

The url to your repository and to your deployed project

[Client repository Link](http://github.com/justo-rivera/dibujio-client)
[Server repository Link](http://github.com/justo-rivera/dibujio-server)

[Deploy Link](http://dibujio-client.herokuapp.com)

### Slides


