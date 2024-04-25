//Client
//we call this function which we get access to due to socket.io script loaded in index.html, to connect to the server 
const socket = io()

//Elements 
const $messageForm = document.querySelector('#myform')
const $messageFormInput = document.querySelector('input')
const $messageFormButton = document.querySelector('button')
const $locationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
const $sidebar = document.querySelector('.chat-sidebar')

//Templates 
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

//Options
//location.search holds the query string '?username=Kritika+&room=South+Delhi' when we join chat, and this function helps to parse 
//this query string into object so that individual values can be accessed
const { username, room } = Qs.parse(location.search, {
    ignoreQueryPrefix : true    //to remove '?' from username when parsing query string to an object
})

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visisble Height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight + 10
    
    if (containerHeight - newMessageHeight < scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('locationMessage', (locationMessage) => {
    const html = Mustache.render(locationTemplate, {
        username : locationMessage.username, 
        url : locationMessage.url,
        createdAt : moment(locationMessage.createdAt).format('HH:mm')
    }) 
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('message', (message) => {
 
    //this will render dynamic messages to the browser window
    const html = Mustache.render(messageTemplate, {
        username : message.username,
        message : message.text,
        createdAt : moment(message.createdAt).format('HH:mm')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
    room = room.toUpperCase()
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    $sidebar.innerHTML = html 
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    //this is to prevent user from double clicking the submit button, so that submit button disables until message is sent to server
    $messageFormButton.setAttribute('disabled', 'disabled')

    //const text = document.querySelector('input').value
    const text = e.target.elements.message.value
    if (text.trim()){
        $messageFormButton.removeAttribute('disabled')
    }
    //here we have set third argument for acknowledment to the client by server
    socket.emit('sendMessage', text, (error) => {
        //re-enabling the button once message is sent to server
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = ''
        $messageFormInput.focus()

        if (error){
            return console.log(error)
        }
        console.log('Message was delivered!')
    })
})

$locationButton.addEventListener('click', () => {

    if (!navigator.geolocation){
        return alert('Geolocation is not supported by your browser')
    }

    $locationButton.setAttribute('disabled', 'disabled')

    navigator.geolocation.getCurrentPosition((position) => {
        locationObject = {
            lat : position.coords.latitude,
            long : position.coords.longitude
        }
        socket.emit('sendLocation', locationObject, () => {
            $locationButton.removeAttribute('disabled')
            console.log('Location shared!')
        })
    })
})

socket.emit( 'join', { username, room }, ( error ) => {
    if (error){
        alert(error)
        location.href = '/'   //sending user back to join page to retry
    }
})