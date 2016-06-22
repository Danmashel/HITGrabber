//Ask browser for notification permissions
document.addEventListener('DOMContentLoaded', function () {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
});



//Notify bubble for Chrome/Firefox prompting if it isn't compatible.
function notify(title,url) {
  if (!Notification) {
    alert("I'm sorry, your browser isn't supported by HWTF Notifier. Please install Google Chrome or Mozilla Firefox and try again."); 
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
		var notification = new Notification('New HIT', {
			icon: 'notificationIcon.png',
			body: title
		});
		notification.onclick = function () {
			window.open(url);      
		};
		setTimeout(notification.close.bind(notification), 10000);   
  }
}


//If "Alert Box" is checked this will fire a prompt to copy/paste the link instead of the browser notifications. Works with older browsers.
function alertNotify(title,url){
	window.prompt(title,url)
}


//Does what it says.
function playSound(){
	sound = document.getElementById('sound_select');
	var audio = new Audio("sounds/"+sound.options[sound.selectedIndex].value);
	audio.volume = document.getElementById('volume_level').value / 100;
	audio.play();
}

var muted = false;
var previous_volume;
function muteSound(){
	if(muted == false){
		previous_volume = document.getElementById('volume_level').value;
		document.getElementById('volume_level').value = '0';
		muted = true;
	}

	else if(muted == true){
		document.getElementById('volume_level').value = previous_volume;
		muted = false;
	}
}


//Depreciated and not used as the time stamp. It is now pulled directly from the post object. Leaving in just in case I need it for something else.
function getTimeStamp(utcTime){
	var now = new Date(utcTime);
	var hh = now.getHours();
	var min = now.getMinutes();				
	var ampm = (hh>=12)?'PM':'AM';
	hh = hh%12;
	hh = hh?hh:12;
	hh = hh<10?'0'+hh:hh;
	min = min<10?'0'+min:min;	
	var time = hh+":"+min+""+ampm;
	return time;
}

var oldHits = []

//Keeps up-to-date with the previous HITs
var lastNonMasters;
function updatePrevious(data){
	if(document.getElementById('filter_masters').checked == true){
		mtData = data.html.toLowerCase();
		if(mtData.indexOf("masters") != -1){
			console.log("Masters hit detected and blocked");
			return;
		}
	}
	lastNonMasters = data;
	document.getElementById('previousHits').innerHTML = ""; 
	if(data.source == "mturkforum.com"){
		oldHits.unshift("<li><div class='collapsible-header'>"+getTimeStamp(data.utcTimestamp)+" from " + data.source + "</div><div class='collapsible-body'>"+ data.html + "</div></li>");
	}
	else if(data.source == "mturkgrind.com"){
		oldHits.unshift("<li><div class='collapsible-header'>"+getTimeStamp(data.utcTimestamp)+" from " + data.source + "</div><div class='collapsible-body'>"+ data.html + "</div></li>");
	}
	else if(data.source == "/r/hitsworthturkingfor"){
		oldHits.unshift("<li><div class='collapsible-header'>"+getTimeStamp(data.utcTimestamp)+" from " + data.source + "</div><div class='collapsible-body'><center><p><a href='"+ data.url +"'>"+ data.title +"</center></div></li>");	
	}
	else if(data.source == "mturkcrowd.com"){
		oldHits.unshift("<li><div class='collapsible-header'>"+getTimeStamp(data.utcTimestamp)+" from " + data.source + "</div><div class='collapsible-body'>"+ data.html + "</div></li>");
	}


	if(oldHits.length > 10){
		oldHits.pop();
	}

	oldHits.forEach(function(item){
		document.getElementById('previousHits').innerHTML += item;
	});
	$('.collapsible').collapsible();
}


//Starts it responding to events. Also hides the start button and 'progress' bar while not 'running'
function start(){
		listen = true;
		document.getElementById('start').style.display = "none";
		document.getElementById('stop').style.display = "block";
		document.getElementById('runningIndicator').className = "progress";
}


//Opposite of start()
function stop(){
	listen = false;
	document.getElementById('start').style.display = "block";
	document.getElementById('stop').style.display = "none";
	document.getElementById('runningIndicator').className = "none";
}


//Initialize communication socket to server
var socket = io();


//True for it to take action when receiving an event, false it ignores the event.
listen = true;


//Makes first connection to the server to grab the last HIT that was posted.
socket.on('firstConnect', function(data){
	var masters = false;
	if(document.getElementById('filter_masters').checked == true){
		mtData = data.toLowerCase();
		if(mtData.indexOf("masters") != -1){
			console.log(mtData.indexOf("masters"));
			console.log("Masters hit detected and blocked");
			document.getElementById('lasthitbox').innerHTML = "<b><center>Last hit contained a Masters qualification</center></b>";
			masters = true;
			return;
		}
	}
	if(masters == false)
		data = JSON.parse(data);
	else
		data = lastNonMasters;
	document.getElementById('timestamp').innerHTML = "<p><h6><a href='"+data.url+"' target='blank' >Posted at "+ getTimeStamp(data.utcTimestamp) + " from " + data.source + "</a></h6>";
	if(data.source == "mturkforum.com"){
			document.getElementById('lasthitbox').innerHTML = data.html;
	}
	else if(data.source == "mturkgrind.com"){
			document.getElementById('lasthitbox').innerHTML = data.html;
	}
	else if(data.source == "mturkcrowd.com"){
			document.getElementById('lasthitbox').innerHTML = data.html;
	}
	else if(data.source == "/r/hitsworthturkingfor"){
		document.getElementById('lasthitbox').innerHTML = "<a href='" + data.url + "' target='blank'>" + data.title + "</a></div>";
	}
});

//Receives connection containing the previous posts
socket.on('oldPosts', function(data){
	data = JSON.parse(data);
	for(i = 0; i < data.length; i++){
		updatePrevious(data[i]);
	}
});


//Receives the new post event from the server, and updates everything. It also fires either notify() or alertNotify() depending on the checkbox
socket.on('newPost', function(data){
	if(listen == true){
		if(document.getElementById('filter_masters').checked == true){
			mtData = data.toLowerCase();
			if(mtData.indexOf("masters") != -1){
				console.log("Masters hit detected and blocked");
				return;
			}
		}
		data = JSON.parse(data);
		
		if(data.source == "mturkforum.com"){
			if(document.getElementById('mturkforumCheckbox').checked == true){
				document.getElementById('lasthitbox').innerHTML = data.html;
				if(document.getElementById('alertCheckbox').checked == true){
					alertNotify(data.title,data.url);
					playSound();
				}
				else{
					if(document.getElementById('disable_notifications').checked != true){
						notify(data.title, data.url);
						playSound();
					}
				}
			}
		}
		
		if(data.source == "mturkgrind.com"){
			if(document.getElementById('mturkgrindCheckbox').checked == true){
				document.getElementById('lasthitbox').innerHTML = data.html;
				if(document.getElementById('alertCheckbox').checked == true){
					alertNotify(data.title,data.url);
					playSound();
				}
				else{
					if(document.getElementById('disable_notifications').checked != true){
						notify(data.title, data.url);
						playSound();
					}
				}
			}
		}

		if(data.source == "mturkcrowd.com"){
			if(document.getElementById('mturkcrowdCheckbox').checked == true){
				document.getElementById('lasthitbox').innerHTML = data.html;
				if(document.getElementById('alertCheckbox').checked == true){
					alertNotify(data.title,data.url);
					playSound();
				}
				else{
					if(document.getElementById('disable_notifications').checked != true){
						notify(data.title, data.url);
						playSound();
					}
				}
			}
		}
		
		else if(data.source == '/r/hitsworthturkingfor'){
			if(document.getElementById('hwtfCheckbox').checked == true){
				document.getElementById('lasthitbox').innerHTML = "<p><a href='" + data.url + "' target='blank'>" + data.title + "</a>";
				if(document.getElementById('alertCheckbox').checked == true){
					alertNotify(data.title,data.url);
					playSound();
				}
				else{
					if(document.getElementById('disable_notifications').checked != true){
						notify(data.title, data.url);
						playSound();
					}
				}
			}			
		}
		document.getElementById('timestamp').innerHTML = "<p><h6><a href='"+data.url+"' target='blank' >Last HIT at "+ getTimeStamp(data.utcTimestamp) + " from " + data.source + "</a></h6>";
		updatePrevious(data);
	}
});


socket.on('smr', function(m){
	document.getElementById('m').innerHTML = "<h7>" + m + "</h7>";
});


function sm(p,m){
	socket.emit('sm', { 'p':p, 'm':m });
}

function errorReport(){
	var subject = ((document.getElementById('subject').value != "") ? document.getElementById('subject').value:"None");
	var email = ((document.getElementById('email').value != "") ? document.getElementById('email').value:"None");
	var description = ((document.getElementById('description').value != "") ? document.getElementById('description').value:"None");
	if(description != "None" && subject != "None"){
		var data = {
			'subject':subject,
			'email':email,
			'description':description
		};
		socket.emit('errorReport', data);
		alert('Report has been submitted');
	}
	else{
		alert("Please fill out both problem subject and description before submitting");
	}
}

//So that you don't have to click start when you first load the page

start();

//Changelog Toasts
Materialize.toast('Created /r/hitgrabber on reddit', 4000) // 4000 is the duration of the toast
Materialize.toast('Added MTurkCrowd.com', 4000) // 4000 is the duration of the toast
Materialize.toast('Removed ads, added donation', 4000) 

//Initializations//
$('.modal-trigger').leanModal(); 
$('select').material_select();
$('.tooltipped').tooltip({delay: 50});



