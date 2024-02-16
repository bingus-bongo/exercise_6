// Constants to easily refer to pages
const SPLASH = document.querySelector(".splash");
const PROFILE = document.querySelector(".profile");
const LOGIN = document.querySelector(".login");
const ROOM = document.querySelector(".room");

// For checking messsages
let message_interval;

// Custom validation on the password reset fields
const passwordField = document.querySelector(".profile input[name=password]");
const repeatPasswordField = document.querySelector(".profile input[name=repeatPassword]");
const repeatPasswordMatches = () => {
  const p = document.querySelector(".profile input[name=password]").value;
  const r = repeatPassword.value;
  return p == r;
};

const checkPasswordRepeat = () => {
  const passwordField = document.querySelector(".profile input[name=password]");
  if(passwordField.value == repeatPasswordField.value) {
    repeatPasswordField.setCustomValidity("");
    return;
  } else {
    repeatPasswordField.setCustomValidity("Password doesn't match");
  }
}

passwordField.addEventListener("input", checkPasswordRepeat);
repeatPasswordField.addEventListener("input", checkPasswordRepeat);

// TODO:  On page load, read the path and whether the user has valid credentials:
//        - If they ask for the splash page ("/"), display it
//        - If they ask for the login page ("/login") and don't have credentials, display it
//        - If they ask for the login page ("/login") and have credentials, send them to "/"
//        - If they ask for any other valid page ("/profile" or "/room") and do have credentials,
//          show it to them
//        - If they ask for any other valid page ("/profile" or "/room") and don't have
//          credentials, send them to "/login", but remember where they were trying to go. If they
//          login successfully, send them to their original destination
//        - Hide all other pages

function gotoSplash() {
  stopMessagePolling();
  const splash_url = '/';
  history.pushState({}, '', splash_url);
  SPLASH.classList.remove('hide');
  PROFILE.classList.add('hide');
  LOGIN.classList.add('hide');
  ROOM.classList.add('hide');
}

function gotoProfile() {
  stopMessagePolling();
  const profile_url = '/profile';
  history.pushState({}, '', profile_url);
  SPLASH.classList.add('hide');
  PROFILE.classList.remove('hide');
  LOGIN.classList.add('hide');
  ROOM.classList.add('hide');
}

function gotoLogin() {
  stopMessagePolling();
  const login_url = '/';
  history.pushState({}, '', login_url);
  SPLASH.classList.add('hide');
  PROFILE.classList.add('hide');
  LOGIN.classList.remove('hide');
  ROOM.classList.add('hide');
}

function gotoRoom() {
  startMessagePolling();
  const room_id = sessionStorage.getItem('room_id');
  const room_url = '/room/' + room_id;
  history.pushState({}, '', room_url);
  SPLASH.classList.add('hide');
  PROFILE.classList.add('hide');
  LOGIN.classList.add('hide');
  ROOM.classList.remove('hide');
}

// Configures what splash looks like based on if we are logged in, gets and sets up links to rooms
async function configureSplash() {
  let api_key = localStorage.getItem('api-key');
  const username = localStorage.getItem('username');
  const logged_in = Boolean(api_key);

  splashLoggedOut = document.querySelector('.splash .loggedOut'); // Show only to logged out
  splashLoggedIn = document.querySelector('.splash .loggedIn');   // Show only to logged in users
  RoomCreateButton = document.querySelector('.create');           // Shows create room when logged in
  SignupButton = document.querySelector('.signup');               // Shows signup to logged out

  if (logged_in) {
    splashLoggedOut.classList.add('hide');
    splashLoggedIn.classList.remove('hide');
    RoomCreateButton.classList.remove('hide');
    SignupButton.classList.add('hide');

    // Configure welcome back message if logged in
    splashLoggedInUsername = SPLASH.querySelector('.splash .username');
    splashLoggedInUsername.innerHTML = 'Welcome back, ' + username + '!';

    // Clear roomlist
    roomList = document.querySelector('.roomList');
    roomList.innerHTML = '';

    // Get roomlist and create anchor list
    const url = '/api/get/rooms';
    const response = await fetch(url, {
      method: 'GET',
    });

    const rooms = await response.json();
    rooms.forEach(room => {
      let newRoom = document.createElement('a');
      newRoom.innerHTML = room['id'] + ': <strong>' + room['name'] + '</strong>';
      roomList.appendChild(newRoom);
      
      if (logged_in) {
          newRoom.addEventListener('click', () => {
              sessionStorage.setItem('room_id', room['id']);
              configureRoom(room['id']);
              gotoRoom();
          });
      }
    })

    noRooms = document.querySelector('.noRooms');
    if (roomList.length == 0) {
      noRooms.classList.remove('hide');
    } else {
      noRooms.classList.add('hide');
    }
  } else {
    splashLoggedOut.classList.remove('hide');
    splashLoggedIn.classList.add('hide');
    RoomCreateButton.classList.add('hide');
    SignupButton.classList.remove('hide');
  }
}

// Sets up what profile should look like
function configureProfile() {
  let api_key = localStorage.getItem('api-key');
  const username = localStorage.getItem('username');
  const logged_in = Boolean(api_key);
  
  if (logged_in) {
    profileUsername = document.querySelector('.profile .username');
    profileUsername.innerHTML = username;
    profileUsernameInput = document.querySelector('input[name="username"]');
    profileUsernameInput.value = username;
  }
}

// Sets up what login page should look like, failed message configured later
function configureLogin() {
  failedLogin = document.querySelector('.failed .message');
  failedLoginButton = document.querySelector('.failed button');
  failedLogin.classList.add('hide');
  failedLoginButton.classList.add('hide');
}

// Sets up what room should look like
async function configureRoom(room_id) {
  let api_key = localStorage.getItem('api-key');
  const username = localStorage.getItem('username');
  const logged_in = Boolean(api_key);
  
  if (logged_in) {
    sessionStorage.setItem('room_id', room_id);
    const roomUsername = document.querySelector('.room .username');
    roomUsername.innerHTML = username;

    // Get room info and setup headers stuff
    const room_url = `/api/roomname/${room_id}`;
    const room_response = await fetch(room_url, {
      method: 'GET',
    })
    const room_info = await room_response.json();
    displayName = document.querySelector('.displayRoomName strong');          // Sets the roomname at the top
    displayName.innerHTML = room_info[room_id];
    inviteLink = document.querySelector('.inviteLink');
    inviteLink.innerHTML = '/rooms/' + room_id;

    displayRoomName = document.querySelector('.roomDetail .displayRoomName'); // Show by default, hide when edit is clicked
    displayRoomName.classList.remove('hide');
    editRoomName = document.querySelector('.roomDetail .editRoomName');       // Hide by default, show when edit is clicked
    editRoomName.classList.add('hide');

    // Clear sample messages
    const chatbox = document.body.querySelector('.messages');
    chatbox.innerHTML = '';

    // Get and fill chatbox
    const chat_url = `/api/rooms/${room_id}`;
    let chat_response = await fetch(chat_url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': api_key,
      },
    })
    const messages = await chat_response.json();
    console.log(messages);
    if (messages['status'] == 'success'){
      console.log('hi');
      sessionStorage.setItem('curr_message', messages['message_dict'].length);
      for (message of messages['message_dict']) {
        new_message = document.createElement('message');
        new_author = document.createElement('author');
        new_author.innerHTML = message['name'];
        new_content = document.createElement('content');
        new_content.innerHTML = message['body'];
        new_message.appendChild(new_author);
        new_message.appendChild(new_content);
        chatbox.appendChild(new_message);
      }
    }

    // ROOM - Setup edit roomname buttons
    editIcon = document.querySelector('.roomDetail .material-symbols-outlined');
    editIcon.addEventListener('click', () => {
      displayRoomName.classList.add('hide');
      editRoomName.classList.remove('hide');
    })

    editRoomNameButton = document.querySelector('.editRoomName button');
    editRoomNameButton.addEventListener('click', async () => {
      let new_room_name = document.querySelector('.editRoomName input').value;
      if (Boolean(new_room_name)) {
        const update_room_name_url = '/api/update/room/name';
        await fetch(update_room_name_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': api_key,
            'new-room-name': new_room_name,
            'room-id': room_id
          }
        })
        displayName.innerHTML = new_room_name;
        displayRoomName.classList.remove('hide');
        editRoomName.classList.add('hide');
      }
    })

    // ROOM - Listen for posting message, send to database
    submitbutton = document.querySelector('.chat button');
    submitbutton.addEventListener('click', async () => {
      let new_message = document.querySelector('.chat textarea').value;
      if (Boolean(new_message)) {
        const post_url = '/api/post/message';
        await fetch(post_url, {
          method: 'POST',
          headers: {
            'api-key': api_key,
            'room-id': room_id,
            'message': new_message,
          }
        })
      }
    })
  }
}

function signout() {
  localStorage.removeItem('api-key');
  localStorage.removeItem('username');
}

function configurePages() {
  configureSplash();
  configureProfile();
  // configureRoom();
  configureLogin();
}

function loadPageFromPath() {
  let api_key = localStorage.getItem('api-key');
  const logged_in = Boolean(api_key);
  path = window.location.pathname;

  // Display splash regardless of credentials
  if (path == '/') {
    gotoSplash();
  } 
  // Redirect from login to splash if logged in
  if (path == '/login' && logged_in) {
    gotoSplash();
  }
  // Show room if logged in
  if (path.startsWith('/room/') && logged_in) {
    const url_room_id = path.substring('/room/'.length);
    const room_id = parseInt(url_room_id);
    configureRoom(room_id);
    gotoRoom();
  } 
  // Show profile if logged in
  if (path == '/profile' && logged_in) {
    gotoProfile();
  }
  // Show login page if not logged in
  if (!logged_in) {
    if (path == '/login') {
      gotoLogin();                
    } else if (path.startsWith('/room/')) {
      sessionStorage.setItem('saved_path', path);
      gotoLogin();
    } else if (path == '/profile') {
      sessionStorage.setItem('saved_path', path);
      gotoLogin();
    }
  }
}

// TODO:  When displaying a page, update the DOM to show the appropriate content for any element
//        that currently contains a {{ }} placeholder. You do not have to parse variable names out
//        of the curly  braces—they are for illustration only. You can just replace the contents
//        of the parent element (and in fact can remove the {{}} from index.html if you want).

// TODO:  Handle clicks on the UI elements.
//        - Send API requests with fetch where appropriate.
//        - Parse the results and update the page.
//        - When the user goes to a new "page" ("/", "/login", "/profile", or "/room"), push it to
//          History

// General - logged in - Clicking welcome back button goes to profile page
profileButtons = document.querySelectorAll('.welcomeBack');
profileButtons.forEach(profileButton => {
  profileButton.addEventListener('click', () => {
    gotoProfile();
  });
});

// SPLASH - Not logged in - Login button goes to login page
loginPageButton = document.querySelector('.loggedOut a');
loginPageButton.addEventListener('click', () => {
  configureLogin();
  gotoLogin();
});

// SPLASH - Not logged in - Signup button signs up, logs in, then reconfigures the pages and returns to splash
signupButton = document.querySelector('.signup');
signupButton.addEventListener('click', async () => {
  const url = '/api/signup';
  const response = await fetch(url, {
    method: 'GET'
  });

  const user_info = await response.json();
  const api_key = user_info['api-key'];
  const username = user_info['username'];

  localStorage.setItem('api-key', api_key);
  localStorage.setItem('username', username);

  configurePages();
  gotoSplash();
});

// SPLASH - logged in - Create a room button
splashCreateRoomButton = document.querySelector('button.create');
splashCreateRoomButton.addEventListener('click', async () => {
  let api_key = localStorage.getItem('api-key');
  const find_room_num_url = '/api/get/rooms';
  const response = await fetch(find_room_num_url, {
    method: 'GET',
    headers: {
      'api-key': api_key
    }
  });
  const rooms = await response.json();
  let roomLen = rooms.length + 1;

  const create_room_url = '/api/create/room'
  await fetch(create_room_url, {
    method: 'POST',
    headers: {
      'api-key': api_key,
      'roomname': 'Room ' + roomLen
     }
  })
  configureRoom(roomLen + 1);
  gotoRoom();
});

// LOGIN - login button for logging in
const loginButton = LOGIN.querySelector('.login button');
const usernameInput = LOGIN.querySelector('input[name="username"]');
const passwordInput = LOGIN.querySelector('input[name="password"]');
loginButton.addEventListener('click', async () => {
  username = usernameInput.value;
  password = passwordInput.value;
  if (Boolean(username) && Boolean(password)) {
    const login_url = '/api/login';
    const login_response = await fetch(login_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'username': username,
        'password': password
      }
    })
  
    const login_info = await login_response.json();
    if (login_info['status'] == 'success') {
      localStorage.setItem('api-key', login_info['api-key']);
      localStorage.setItem('username', login_info['username']);
      const saved_path = sessionStorage.getItem('saved_path');
      if (Boolean(saved_path)) {
        history.pushState(null, '', saved_path);
        configurePages();
        loadPageFromPath();
      } else {
        configurePages();
        gotoSplash();
      }
    } else {
      failedLogin = document.querySelector('.failed .message');
      failedLoginButton = document.querySelector('.failed button');
      failedLogin.classList.remove('hide');
      failedLoginButton.classList.remove('hide');
    }
  } else {
    failedLogin = document.querySelector('.failed .message');
    failedLoginButton = document.querySelector('.failed button');
    failedLogin.classList.remove('hide');
    failedLoginButton.classList.remove('hide');
  }
})

// LOGIN - Create account button, same function as one click signup
loginPageCreateButton = document.querySelector('.failed button');
loginPageCreateButton.addEventListener('click', async () => {
  const signup_url = '/api/signup';
  const response = await fetch(signup_url, {
    method: 'GET'
  })

  const user_info = await response.json();
  const api_key = user_info['api-key'];
  const username = user_info['username'];

  localStorage.setItem('api-key', api_key);
  localStorage.setItem('username', username);

  configurePages();
  gotoSplash();
});

// PROFILE - Update username
updateUsernameButton = PROFILE.querySelector('.updateUsernameButton');
updateUsernameButton.addEventListener('click', async () => {
  let usernameInput = PROFILE.querySelector('input[name="username"]').value;
  if (Boolean(usernameInput)) {
    const update_username_url = '/api/update/username';
    let api_key = localStorage.getItem('api-key');
    let usernameInput = PROFILE.querySelector('input[name="username"]').value;
    let response = await fetch(update_username_url, {
      method: 'POST',
      headers: {
        'api-key': api_key,
        'new-username': usernameInput,
      }
    })
    if (response.ok) {
      localStorage.setItem('username', usernameInput);
    }
  }
})

// PROFILE - Update password
updatePasswordButton = PROFILE.querySelector('.updateUsernameButton');
updatePasswordButton.addEventListener('click', async () => {
  let passwordInput = passwordField.value;
  if (Boolean(passwordInput)) {
    let api_key = localStorage.getItem('api-key');
    const update_password_url = '/api/update/password';
    await fetch(update_password_url, {
      method: 'POST',
      headers: {
        'api-key': api_key,
        'new-password': passwordInput,
      }
    })
  }
})

// PROFILE - Signout button
logoutButton = PROFILE.querySelector('.logout');
logoutButton.addEventListener('click', () => {
  signout();
  configureSplash();
  gotoSplash();
});

// PROFILE - Coolletsgo button
coolLetsGoButton = PROFILE.querySelector('.goToSplash');
coolLetsGoButton.addEventListener('click', () => {
  configureSplash();
  gotoSplash();
})

// TODO:  When a user enters a room, start a process that queries for new chat messages every 0.1
//        seconds. When the user leaves the room, cancel that process.
//        (Hint: https://developer.mozilla.org/en-US/docs/Web/API/setInterval#return_value)

async function startMessagePolling() {
  message_interval = setInterval(async () => {
  const chatbox = document.body.querySelector('.messages');
  const curr_message = sessionStorage.getItem('curr_message');
  const room_id = sessionStorage.getItem('room_id');
  const api_key = localStorage.getItem('api-key');
    // Get and fill chatbox
    const chat_url = `/api/rooms/${room_id}`;
    let chat_response = await fetch(chat_url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'api-key': api_key,
      },
    })
    const messages = await chat_response.json();
    console.log(messages);
    if (messages['status'] == 'success'){
      console.log(curr_message);
      console.log(messages['message_dict'].length);
      if (messages['message_dict'].length > curr_message) {
        console.log('getting bingus');
        for (let i = curr_message; i < messages['message_dict'].length; i++) {
          let message = messages['message_dict'][i];
          new_message = document.createElement('message');
          new_author = document.createElement('author');
          new_author.innerHTML = message['name'];
          new_content = document.createElement('content');
          new_content.innerHTML = message['body'];
          new_message.appendChild(new_author);
          new_message.appendChild(new_content);
          chatbox.appendChild(new_message);
        }
      }
      sessionStorage.setItem('curr_message', messages['message_dict'].length);
    }
  }, 500);
}

function stopMessagePolling() {
  if (message_interval) {
    clearInterval(message_interval);
  }
}

window.addEventListener('popstate', function(event) {
  console.log(event);
  loadPageFromPath();
})

// On page load, show the appropriate page and hide the others
configurePages();
loadPageFromPath();
