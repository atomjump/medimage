/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
 
//Source code Copyright (c) 2018 AtomJump Ltd. (New Zealand)

var deleteThisFile = {}; //Global object for image taken, to be deleted
var centralPairingUrl = "https://atomjump.com/med-genid.php";		//Redirects to an https connection. In future try setting to http://atomjump.org/med-genid.php
var glbThis = {};  //Used as a global error handler
var retryIfNeeded = [];	//A global pushable list with the repeat attempts
var checkComplete = [];	//A global pushable list with the repeat checks to see if image is on PC
var retryNum = 0;


//See: https://stackoverflow.com/questions/14787705/phonegap-cordova-filetransfer-abort-not-working-as-expected
// basic implementation of hash map of FileTransfer objects
// so that given a key, an abort function can find the right FileTransfer to abort
function SimpleHashMap()
{
    this.items = {};
    this.setItem = function(key, value) { this.items[key] = value; }
    this.getItem = function(key)
                   {
                       if (this.hasItem(key)) { return this.items[key]; }
                       return undefined;                    
                   }
    this.hasItem = function(key) { return this.items.hasOwnProperty(key); }
    this.removeItem = function(key)
                      {
                          if (this.hasItem(key)) { delete this.items[key]; }
                      }
}
var fileTransferMap = new SimpleHashMap(); 





var app = {


    // Application Constructor
    initialize: function() {

		glbThis = this;
        this.bindEvents();  
        
        
        //Set display name
        this.displayServerName();
        
        //Initialise the id field
        this.displayIdInput();
        
        //Check if there are any residual photos that need to be sent again
        glbThis.loopLocalPhotos();
        

    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'app.receivedEvent(...);'
    onDeviceReady: function() {
          app.receivedEvent('deviceready');
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
		if(parentElement) {
			var listeningElement = parentElement.querySelector('.listening');
			var receivedElement = parentElement.querySelector('.received');

			listeningElement.setAttribute('style', 'display:none;');
			receivedElement.setAttribute('style', 'display:block;');
			console.log('Received Event: ' + id);
		} else {
			console.log('Failed Received Event: ' + id);
		}
		
        
    },
    
    processPicture: function(imageURIin)
    {
        var _this = this;
        glbThis = this;
      
    	  //Called from takePicture(), after the image file URI has been shifted into a persistent file
          //Reconnect once
      	  localStorage.removeItem("usingServer");		//This will force a reconnection
	      localStorage.removeItem("defaultDir");
      	  
      	  var thisImageURI = imageURIin;
      	  var idEntered = document.getElementById("id-entered").value;
       	  
       	  //Store in case the app quits unexpectably
       	  _this.determineFilename(imageURIin, idEntered, function(err, newFilename, imageURI) {
       	  	
       	  	   
       	  	   if(err) {
       	  	   		//There was a problem getting the filename from the disk file
       	  	   		glbThis.notify("Sorry, we cannot process the filename of the photo " + idEntered + ". If this happens consistently, please report the problem to medimage.co.nz");
       	  	   
       	  	   } else {
       	  	   	 
       	  	   	   _this.recordLocalPhoto( imageURI, idEntered, newFilename);
       	  	   	 
				   _this.findServer(function(err) {
						if(err) {
							glbThis.notify("Sorry, we cannot connect to the server. Trying again in 10 seconds.");
							//Search again in 10 seconds:
							var passedImageURI = imageURI;   //OLD: thisImageURI;
							var idEnteredB = idEntered;
					
							setTimeout(function() {
								localStorage.removeItem("usingServer");		//This will force a reconnection
								localStorage.removeItem("defaultDir");
								glbThis.uploadPhoto(passedImageURI, idEnteredB, newFilename);
							}, 10000);
						} else {
				
				
							//Now we are connected, upload the photo again
							glbThis.uploadPhoto(imageURI, idEntered, newFilename);		//OLD: thisImageURI
						}
				  });
			  }
       	  
       	  
       	  });
       	  
       	  
      	 
	},

    takePicture: function() {
      var _this = this;
      glbThis = this;

      navigator.camera.getPicture( function( imageURI ) {
      	//Move picture into persistent storage
      	  //Grab the file name of the photo in the temporary directory
		  var currentName = imageURI.replace(/^.*[\\\/]/, '');
		 
		  //Create a new name for the photo
		  var d = new Date(),
			  n = d.getTime(),
			  newFileName = n + ".jpg";
			
			
		   window.resolveLocalFileSystemURI( imageURI, function(fileEntry) {
		 
		 	  var myFile = fileEntry;
			 	  
			 	   try {	
					  //Try moving the file to permanent storage
					  window.resolveLocalFileSystemURL( cordova.file.dataDirectory, 
		                function(directory) {
					  
						  try {
							  myFile.moveTo(directory, newFileName, function(success){
						 		//Moved it to permanent storage successfully
								//success.fullPath contains the path to the photo in permanent storage
								if(success.nativeURL) {
									glbThis.processPicture(success.nativeURL);
								} else {
									glbThis.notify("Sorry we could not find the moved photo on the phone. Please let medimage.co.nz know that a moveFile() has not worked correctly.");
								}
								
								
							  }, function(err){
								//an error occured moving file - send anyway, even if it is in the temporary folder
								glbThis.processPicture(imageURI);
							  });
						   } catch(err) {
						   		//A problem moving the file but send the temp file anyway
					  			glbThis.processPicture(imageURI);
						   }
					   }, function(err) {
					   		//an error occured moving file - send anyway, even if it is in the temporary folder
							glbThis.processPicture(imageURI);
					   
					   });
				   } catch(err) {
				   	  //A proble occured determining if the persistent folder existed
					  glbThis.processPicture(imageURI);
				   
				   }

			},
			function(err) {
				//Could not resolve local file
				glbThis.notify("Sorry we could not find the photo on the phone.");
			
		   });
    
        },
       function( message ) {
       	 //An error or cancellation
         glbThis.notify( message );
       },
       {
        quality: 100,
        destinationType: Camera.DestinationType.FILE_URI
       });
    },
    
    
    recordLocalPhoto: function(imageURI, idEntered, fileName) {
    	 //Save into our localPhotos array, in case the app quits
    	 
       	  var localPhotos = glbThis.getArrayLocalStorage("localPhotos");
       	  if(!localPhotos) {
       	  	localPhotos = [];
       	  }
       	  var newPhoto = {
       	  					"imageURI" : imageURI,
       	  					"idEntered" : idEntered,
       	  					"fileName" : fileName,
       	  					"status" : "send"
       	  					};		//Status can be 'send', 'onserver', 'sent' (usually deleted from the array), or 'cancel' 
       	  localPhotos.push(newPhoto);
       	  glbThis.setArrayLocalStorage("localPhotos", localPhotos);
    	  return true;
    },
    
    changeLocalPhotoStatus: function(imageURI, newStatus, fullData) {
    	//Input:
    	//imageURI  - unique image address on phone filesystem 
    	//newStatus can be 'send', 'onserver', 'sent' (usually deleted from the array), or 'cancel' 
    	//If onserver, the optional parameter 'fullGet', is the URL to call to check if the file is back on the server
    	
    	
    	var localPhotos = glbThis.getArrayLocalStorage("localPhotos");
    	if(!localPhotos) {
       	  	localPhotos = [];
       	}
    	
    	for(var cnt = 0; cnt< localPhotos.length; cnt++) {
    		if(localPhotos[cnt].imageURI === imageURI) {
    	
    			if(newStatus === "cancel") {
    				//Delete the photo
    				window.resolveLocalFileSystemURI(imageURI, function(fileEntry) {
    					
    					//Remove the file from the phone
    					fileEntry.remove();
    					
    					//Remove entry from the array
    					
    					
    					var splicing = cnt - 1;
    					
    					localPhotos.splice(splicing,1);
    					
    					
    					//Set back the storage of the array
    					glbThis.setArrayLocalStorage("localPhotos", localPhotos);
    					
    				}, function(evt) {
    				
    				 	//Some form of error case. We likely couldn't find the file, but we still want to remove the entry from the array
    				 	//in this case
    				 	var errorCode = null; 
    				 	if(evt.code) {
    				 		errorCode = evt.code;
    				 	}
    				 	if(evt.target && evt.target.error.code) {
    				 		errorCode = evt.target.error.code;
    				 	}
     				 	if(errorCode === 1) {
    				 		//The photo is not there. Remove anyway    				 		
    				 		//Remove entry from the array
    				 		var splicing = cnt - 1;
    						localPhotos.splice(splicing,1);
    					
    						//Set back the storage of the array
    						glbThis.setArrayLocalStorage("localPhotos", localPhotos);
    				 	} else {
    				 	
    				 		glbThis.notify("Sorry, there was a problem removing the photo on the phone. Error code: " + evt.target.error.code);
    				 		//Remove entry from the array
    				 		var splicing = cnt - 1;
    						localPhotos.splice(splicing,1);
    					
    						//Set back the storage of the array
    						glbThis.setArrayLocalStorage("localPhotos", localPhotos);
    				 	}
    				 
    				});
    			} else {
    				localPhotos[cnt].status = newStatus;
    				
    				//TESTING: alert("Testing: Full Data: " + JSON.stringify(fullData));
    				if((newStatus == "onserver")&&(fullData)) {
    					localPhotos[cnt].fullData = JSON.stringify(fullData);		//Create a copy of the JSON data array in string format
    				
    				}
    				
    				//Set back the storage of the array
    				glbThis.setArrayLocalStorage("localPhotos", localPhotos);
    			}
    		}
    	
    	}
    
    },
    
    loopLocalPhotos: function() {
     
      	//Get a photo, one at a time, in the array format:
      	/* {
       	  					"imageURI" : imageURI,
       	  					"idEntered" : idEntered,
       	  					"fileName" : fileName,
       	  					"fullData" : fullDataObject stringified - optional
       	  					"status" : "send"
       	  					};		//Status can be 'send', 'onserver', 'sent' (usually deleted from the array), or 'cancel' 
       	
       	and attempt to upload them.
       	*/
      	var photoDetails = null;
      	
    	var localPhotos = glbThis.getArrayLocalStorage("localPhotos");
    	if(!localPhotos) {
       	  	localPhotos = [];
       	}
       	
       	
       	for(var cnt = 0; cnt< localPhotos.length; cnt++) {
      		var newPhoto = localPhotos[cnt];
      		if(newPhoto) {
      		
      			if(newPhoto.status == 'onserver') {
      				//OK - so it was successfully put onto the server. Recheck to see if it needs to be uploaded again
      				if(newPhoto.fullData) {
      					
      					try {
      						var fullData = JSON.parse(newPhoto);
      						
      						checkComplete.push(nowChecking);
      						glbThis.check();		//This will only upload again if it finds it hasn't been transferred off the 
      												//server
      					} catch(err) {
      						//There was a problem parsing the data. Resends the whole photo, just in case
      						glbThis.uploadPhoto(newPhoto.imageURI, newPhoto.idEntered, newPhoto.fileName);
      						
      					}
      				} else {
      					//No fullData was added - resend anyway
      					glbThis.uploadPhoto(newPhoto.imageURI, newPhoto.idEntered, newPhoto.fileName);
      				
      				}
      					
      			
      			} else {
        			//Needs to be resent
        			glbThis.uploadPhoto(newPhoto.imageURI, newPhoto.idEntered, newPhoto.fileName);
        		}
        	}    	
    	}
    	
    	
    	return;
    
    }, 
    
    

   get: function(url, cb) {
        var request = new XMLHttpRequest();
        request.open("GET", url, true);
   
   		var getTimeout = setTimeout(function() {
            cb(url, null);   // Assume it hasn't gone through - we have a 404 error checking the server
        }, 5000);
   			
                	
   
        request.onreadystatechange = function() {
            if (request.readyState == 4) {

                if (request.status == 200 || request.status == 0) {
					clearTimeout(getTimeout);
                    cb(url, request.responseText);   // -> request.responseText <- is a result		
                    
                }
            }
        }
        request.onerror = function() {
        	clearTimeout(getTimeout);
        	cb(url, null);			
        }
        request.send();
    },

    scanlan: function(port, cb) {
      var _this = this;

      if(this.lan) {

       var lan = this.lan;


       for(var cnt=0; cnt< 255; cnt++){
          var machine = cnt.toString();
          var url = 'http://' + lan + machine + ':' + port;
          this.get(url, function(goodurl, resp) {
              if(resp) {
                 
                 //Save the first TODO: if more than one, open another screen here
                 localStorage.setItem("currentWifiServer", goodurl);
                 
                 
                 clearTimeout(scanning);
                 cb(goodurl, null);
              }
          });


       }

       //timeout after 5 secs
       var scanning = setTimeout(function() {
            _this.notify('Timeout finding your Wifi server.');
       }, 4000);



      } else {
		  //No lan detected
         cb(null,'Local Wifi server not detected.');
      }
    },


    notify: function(msg) {
        //Set the user message
        document.getElementById("notify").innerHTML = msg;
    },
    
    cancelNotify: function(msg) {
        //Set the user message
        document.getElementById("cancel-trans").innerHTML = msg;
    },


	cancelUpload: function(cancelURI) {
	
		var ft = fileTransferMap.getItem(cancelURI);
		if (ft)
		{
		    ft.abort(glbThis.win, glbThis.fail);
		    
		    //remove the photo
		    glbThis.changeLocalPhotoStatus(cancelURI, "cancel");
		}		
		
	},
	
	determineFilename: function(imageURIin, idEntered, cb) {
		//Determines the filename to use based on the imageURI of the photo, 
		//and the id entered into the text field.
		//Calls back with: cb(err, newFilename, imageURI)
		//    where err is null for no error, or text of the error,
		//    and the newFilename as a text string which includes the .jpg at the end
		//    imageURI is the local filesystem resolved URI
		//It will use the current date / time from the phone, thought this format varies slightly
		//phone to phone.

		//Have connected OK to a server
		var idEnteredB = idEntered;
		
        window.resolveLocalFileSystemURI(imageURIin, function(fileEntry) {

				deleteThisFile = fileEntry; //Store globally
			
				var imageURI = fileEntry.toURL();
				
				alert("TESTING: resolved file: " + imageURI);		//TESTING
				
				var tempName = idEnteredB;
				if((tempName == '')||(tempName == null)) {
					tempName = 'image';
				}
				
				var initialHash = localStorage.getItem("initialHash");
				if((initialHash)&&(initialHash != null)) {
					if(initialHash == 'true') {
						//Prepend the initial hash
						tempName = "#" + tempName;
					
					}
				} else {
					//Not set, so prepend the initial hash by default
					tempName = "#" + tempName;
				}

				var defaultDir = localStorage.getItem("defaultDir");
				if((defaultDir)&&(defaultDir != null)) {
					//A hash code signifies a directory to write to
					tempName = "#" + defaultDir + " " + tempName;
				}

				var myoutFile = tempName.replace(/ /g,'-');
				var idEnteredC = idEnteredB;				//Get a 2nd tier of variable

				navigator.globalization.dateToString(
					new Date(),
					function (date) {
						var mydt = date.value.replace(/:/g,'-');
						mydt = mydt.replace(/ /g,'-');
						mydt = mydt.replace(/\//g,'-');
						

						var aDate = new Date();
						var seconds = aDate.getSeconds();
						mydt = mydt + "-" + seconds;

						mydt = mydt.replace(/,/g,'');  //remove any commas from iphone
						mydt = mydt.replace(/\./g,'-');  //remove any fullstops

						var myNewFileName = myoutFile + '-' + mydt + '.jpg';	
						alert("TESTING: myNewFileName: " + myNewFileName);		//TESTING
						cb(null, myNewFileName, imageURI);
					},
					function () { 
						navigator.notification.alert('Sorry, there was an error getting the current date\n');
						cb("Sorry, there was an error getting the current date");
					},
					{ formatLength:'medium', selector:'date and time'}
				); //End of function in globalization date to string




		}, function(evt) {
			//An error accessing the file
			//and potentially delete phone version
			glbThis.changeLocalPhotoStatus(myImageURIin, 'cancel');
			cb("Sorry, we could not access the photo file");
			
		});		//End of resolveLocalFileSystemURI
	
		
	
	},

    uploadPhoto: function(imageURIin, idEntered, newFilename) {
  
        var _this = this;
	
		var usingServer = localStorage.getItem("usingServer");
		
		var idEnteredB = idEntered;
	
	
		if((!usingServer)||(usingServer == null)) {
			//No remove server already connected to, find the server now. And then call upload again
			_this.findServer(function(err) {
				if(err) {
					window.plugins.insomnia.allowSleepAgain();		//Allow sleeping again
					
					glbThis.notify("Sorry, we cannot connect to the server. Trying again in 10 seconds.");
					//Search again in 10 seconds:
					setTimeout(function() {
						glbThis.uploadPhoto(imageURIin, idEnteredB, newFilename)
						}, 10000);
				} else {
					//Now we are connected, upload the photo again
					glbThis.uploadPhoto(imageURIin, idEnteredB, newFilename);
				}
			});
			return;
		} else {
			//Have connected OK to a server
			var myImageURIin = imageURIin;
			var imageURI = imageURIin;

			var options = new FileUploadOptions();
			options.fileKey="file1";
			options.mimeType="image/jpeg";

			var params = new Object();
			params.title = idEntered; 
			if((params.title == '')||(params.title == null)) {
				if((idEnteredB == '')||(idEnteredB == null)) {
					params.title = 'image';
				} else {
					params.title = idEnteredB;
				}
				
			}

			options.fileName = newFilename;
			options.params = params;
			options.chunkedMode = false;		//chunkedMode = false does work, but still having some issues. =true may only work on newer systems?
			options.headers = {
				Connection: "close"
			}
			
			options.idEntered = idEnteredB;


			var ft = new FileTransfer();
			_this.notify("Uploading " + params.title);
			_this.cancelNotify("<ons-icon style=\"vertical-align: middle; color:#f7afbb;\" size=\"30px\" icon=\"fa-close\" href=\"#javascript\" onclick=\"app.cancelUpload('" + imageURI + "');\"></ons-icon><br/>Cancel");

			ft.onprogress = _this.progress;

		 
		 
			var serverReq = usingServer + '/api/photo';

			var repeatIfNeeded = {
				"imageURI" : imageURI,
				"serverReq" : serverReq,
				"options" :options,
				"failureCount": 0,
				"nextAttemptSec": 15
			};
			
			retryIfNeeded.push(repeatIfNeeded);
			
			fileTransferMap.setItem(imageURI, ft);		//Make sure we can abort this photo later
			

			//Keep the screen awake as we upload
			window.plugins.insomnia.keepAwake();
			
			alert("TESTING: Uploading: " + imageURI + " to server: " + serverReq + "   With options:" + JSON.stringify(options));
			
			ft.upload(imageURI, serverReq, _this.win, _this.fail, options);
	     
         }		//End of connected to a server OK
    },
	
    progress: function(progressEvent) {
    	var statusDom = document.querySelector('#status');
    	
		if (progressEvent.lengthComputable) {
			var perc = Math.floor(progressEvent.loaded / progressEvent.total * 100);
			statusDom.innerHTML = perc + "% uploaded...";
		} else {
			if(statusDom.innerHTML == "") {
				statusDom.innerHTML = "Uploading";
			} else {
				statusDom.innerHTML += ".";
			}
		}
	},
			
    retry: function(existingText) {
    	    
    	    window.plugins.insomnia.allowSleepAgain();		//Allow sleeping again
    	    
	     	var repeatIfNeeded = retryIfNeeded.pop();
	     	
	     	if(repeatIfNeeded) {
	    	 	//Resend within a minute here
	    	 	var t = new Date();
				t.setSeconds(t.getSeconds() + repeatIfNeeded.nextAttemptSec);
				var timein = (repeatIfNeeded.nextAttemptSec*1000);		//In microseconds
	    	 	repeatIfNeeded.nextAttemptSec *= 3;						//Increase the delay between attempts each time to save battery
	    	 	if(repeatIfNeeded.nextAttemptSec > 21600) repeatIfNeeded.nextAttemptSec = 21600;		//If longer than 6 hours gap, make 6 hours (that is 60x60x6)
	    	 	var hrMin =  t.getHours() + ":" + t.getMinutes();
	    	 	
	    	 	glbThis.notify(existingText + " Retrying " + repeatIfNeeded.options.params.title + " at " + hrMin);
	    	
	    		repeatIfNeeded.failureCount += 1;						//Increase this
	    		if(repeatIfNeeded.failureCount > 2) {
	    			//Have tried too many attempts - try to reconnect completely (i.e. go
	    			//from wifi to network and vica versa
	    			localStorage.removeItem("usingServer");				//This will force a reconnection
	    			localStorage.removeItem("defaultDir");
	    			localStorage.removeItem("serverRemote");
	    			glbThis.uploadPhoto(repeatIfNeeded.imageURI, repeatIfNeeded.options.idEntered, repeatIfNeeded.options.idEntered, repeatIfNeeded.options.fileName);
	    			
	    			//Clear any existing timeouts
	    			if(repeatIfNeeded.retryTimeout) {
	    				clearTimeout(repeatIfNeeded.retryTimeout);
	    			}
	    			
	    			//Clear the current transfer too
	    			repeatIfNeeded.ft.abort();
	    			return;
	    		} else {
	    			//OK in the first few attempts - keep the current connection and try again
	    			//Wait 10 seconds+ here before trying the next upload					
					repeatIfNeeded.retryTimeout = setTimeout(function() {
						repeatIfNeeded.ft = new FileTransfer();
					
						repeatIfNeeded.ft.onprogress = glbThis.progress;
					
						glbThis.notify("Trying to upload " + repeatIfNeeded.options.params.title);	
						glbThis.cancelNotify("<ons-icon size=\"30px\" style=\"vertical-align: middle; color:#f7afbb;\" icon=\"fa-close\" href=\"#javascript\" onclick=\"app.cancelUpload('" + repeatIfNeeded.imageURI + "');\"></ons-icon><br/>Cancel");
					
						retryIfNeeded.push(repeatIfNeeded);
					
						//Keep the screen awake as we upload
						window.plugins.insomnia.keepAwake();
						
						repeatIfNeeded.ft.upload(repeatIfNeeded.imageURI, repeatIfNeeded.serverReq, glbThis.win, glbThis.fail, repeatIfNeeded.options);
					}, timein);											//Wait 10 seconds before trying again	
				}
	     	}
      },



	  check: function(){
	  		//Checks to see if the next photo on the server (in the checkComplete stack) has been sent on to the PC successfully. If not it will keep pinging until is has been dealt with, or it times out.
	  		
			var nowChecking = checkComplete.pop();
			nowChecking.loopCnt --;
			
		 
			if(nowChecking.loopCnt <= 0) {
				
				
 				//Have finished - remove interval and report back
				if(!nowChecking.slowLoopCnt) {
					document.getElementById("notify").innerHTML = "You are experiencing a slightly longer transfer time than normal, likely due to a slow network.  Your image should be delivered shortly.";
					
					window.plugins.insomnia.allowSleepAgain();			//Allow the screen to sleep, we could be here for a while.
					
					//Now continue to check with this photo, but only once every 30 seconds, 90 times (i.e. for 45 minutes).
					nowChecking.slowLoopCnt = 90;
					checkComplete.push(nowChecking);
					
					//The file exists on the server still - try again in 30 seconds
					setTimeout(glbThis.check, 30000);
				} else {
					//Count down
					nowChecking.slowLoopCnt --;
					
					if(nowChecking.slowLoopCnt <= 0) {
						//Have finished the long count down, and given up
						document.getElementById("notify").innerHTML = "Sorry, the image is on the remote server, but has not been delivered to your local PC.  We will try again once your app restarts.";
						
						glbThis.cancelNotify("");		//Remove any cancel icons
					} else {
						//Otherwise in the long count down
						checkComplete.push(nowChecking);
						var myNowChecking = nowChecking;
						
						
						glbThis.get(nowChecking.fullGet, function(url, resp) {
					
					
							if((resp === "false")||(resp === false)) {
								//File no longer exists, success!
								var myTitle = "Image";
								if(myNowChecking.details && myNowChecking.details.options && myNowChecking.details.options.params && myNowChecking.details.options.params.title && myNowChecking.details.options.params.title != "") {
									myTitle = myNowChecking.details.options.params.title;
								}
								
								checkComplete.pop();
								var more = " " + checkComplete.length + " more.";			//Some more yet
								
								
								
								
								if(checkComplete.length == 0) {
									document.getElementById("notify").innerHTML = myTitle + ' transferred. Success! ';								
									
								} else {
									
									if(myTitle != "") {
									
										document.getElementById("notify").innerHTML = myTitle + ' transferred. Success!' + more;
									} else {
										document.getElementById("notify").innerHTML = 'Image transferred. Success!' + more;
									}
								}
								
								
								//and delete phone version
								if(myNowChecking.details) {
									glbThis.changeLocalPhotoStatus(myNowChecking.details.imageURI, 'cancel');
								} else {
									document.getElementById("notify").innerHTML = 'Image transferred. Success! ' + more + ' Note: The image will be resent on a restart to verify.';
								}
							} else {
								//The file exists on the server still - try again in 30 seconds
								setTimeout(glbThis.check, 30000);
							} 
						});
					}
				}
 
 
			} else {
				//Try a get request to the check
				//Get the current file data
				checkComplete.push(nowChecking);
			
				glbThis.cancelNotify("");		//Remove any cancel icons
				var myNowChecking = nowChecking;
				
				document.getElementById("notify").innerHTML = "Image on server. Transferring to PC.. " + nowChecking.loopCnt;
				glbThis.cancelNotify("");		//Remove any cancel icons
  
  
  				var myNowChecking = nowChecking;
				glbThis.get(nowChecking.fullGet, function(url, resp) {
					
					if((resp === "false")||(resp === false)) {
						//File no longer exists, success!
						checkComplete.pop();
						
						var myTitle = "Image";
						if(myNowChecking.details && myNowChecking.details.options && myNowChecking.details.options.params && myNowChecking.details.options.params.title && myNowChecking.details.options.params.title != "") {
							myTitle = myNowChecking.details.options.params.title;
						}
						
						
						var more = " " + checkComplete.length + " more.";			//Some more yet
						if(checkComplete.length == 0) {
							document.getElementById("notify").innerHTML = myTitle + ' transferred. Success! '; 
						} else {
							if(myTitle != "") {
								document.getElementById("notify").innerHTML = myTitle + ' transferred. Success!' + more;
							} else {
								document.getElementById("notify").innerHTML = 'Image transferred. Success!' + more;
							}
						}
						
						
						
						
						
						//and delete phone version
						if(myNowChecking.details) {
            				glbThis.changeLocalPhotoStatus(myNowChecking.details.imageURI, 'cancel');
            			} else {
            				document.getElementById("notify").innerHTML = 'Image transferred. Success! ' + more + ' Note: The image will be resent on a restart to verify.';
            			}
						
					} else {
						//The file exists on the server still - try again in a few moments
						setTimeout(glbThis.check, 2000);
					} 
				});
			}
									
								
	},
						

    win: function(r) {
    	    
    	    //Have finished transferring the file to the server
    	    window.plugins.insomnia.allowSleepAgain();		//Allow sleeping again
    	    
    	    document.querySelector('#status').innerHTML = "";	//Clear progress status
    	    
    	   
    	    glbThis.cancelNotify("");		//Remove any cancel icons
 
 
    	    //Check if this was a transfer to the remote server
            console.log("Code = " + r.responseCode);
            console.log("Response = " + r.response);
            console.log("Sent = " + r.bytesSent);
            if((r.responseCode == 200)||(r.response.indexOf("200") != -1)) {
            
            	var remoteServer = localStorage.getItem("serverRemote");
            	if(remoteServer == 'false') {
            		//i.e. Wifi case
            		
            		
            		
            		
            		//and delete phone version of file
            		var repeatIfNeeded = retryIfNeeded.pop();
            		var more = " " + retryIfNeeded.length + " more.";			//Some more yet
            		var myTitle = "Image";
            		
            		if(repeatIfNeeded) {
            			
						if(repeatIfNeeded.detail && repeatIfNeeded.detail.options && repeatIfNeeded.detail.options.params && repeatIfNeeded.detail.options.params.title && repeatIfNeeded.detail.options.params.title != "") {
							document.getElementById("notify").innerHTML = myTitle + ' transferred. Success! ' + more;
							myTitle = repeatIfNeeded.detail.options.params.title;
						} else {
							document.getElementById("notify").innerHTML = 'Image transferred. Success!' + more;
						}
            		
            			glbThis.changeLocalPhotoStatus(repeatIfNeeded.imageURI, 'cancel');
            		} else {
						//Trying to check, but no file on stack	
						document.getElementById("notify").innerHTML = 'Image transferred. Success! ' + more + ' Note: The image will be resent on a restart to verify.';
					}
            
            	} else {
            		//Onto remote server - now do some pings to check we have got to the PC
            		document.getElementById("notify").innerHTML = 'Image on server. Transferring to PC..';
            		
            		
            		var repeatIfNeeded = retryIfNeeded.pop();
            		
            		
	     			
	     	
	     			if(repeatIfNeeded) {
	     				var thisFile = repeatIfNeeded.options.fileName;
	     				var usingServer = localStorage.getItem("usingServer");
	     				
	     				var fullGet = usingServer + '/check=' + encodeURIComponent(thisFile);
	     				
	     				var nowChecking = {};
						
						nowChecking.loopCnt = 11; //Max timeout = 11*2 = 22 secs but also a timeout of 5 seconds on the request.
						nowChecking.fullGet = fullGet;
						nowChecking.details = repeatIfNeeded;
						checkComplete.push(nowChecking);
						
						//Set an 'onserver' status
	     				glbThis.changeLocalPhotoStatus(repeatIfNeeded.imageURI, 'onserver', nowChecking);
						
						setTimeout(function() {	//Wait two seconds and then do a check
							glbThis.check();
						}, 2000);
					} else {
						//Trying to check, but no file on stack	
					}
            	
            	}
            	            	
            	//Save the current server settings for future reuse
            	glbThis.saveServer();


            
            } else {
            	//Retry sending
            	glbThis.retry("");
            	
            }

    },


    fail: function(error) {
  
  		window.plugins.insomnia.allowSleepAgain();			//Allow the screen to sleep
  		
  		document.querySelector('#status').innerHTML = "";	//Clear progress status
  
  		glbThis.cancelNotify("");		//Remove any cancel icons
  		
        switch(error.code)
        {
            case 1:
                glbThis.notify("The photo was uploaded.");
            break;

            case 2:
                glbThis.notify("Sorry you have tried to send it to an invalid URL.");
            break;

            case 3:
                glbThis.notify("Waiting for better reception..");
                glbThis.retry("Waiting for better reception...</br>");
            break;

            case 4:
                glbThis.notify("Your image transfer was aborted.");
                //No need to retry here: glbThis.retry("Sorry, your image transfer was aborted.</br>");
            break;

            default:
                glbThis.notify("An error has occurred: Code = " + error.code);
            break;
        }
    },

    getip: function(cb) {

           var _this = this;

           //timeout after 3 secs -rerun this.findServer()
           var iptime = setTimeout(function() {
                  var err = "You don't appear to be connected to your wifi. Please connect and try again.";
                  
                  cb(err);
           }, 5000);

           networkinterface.getWiFiIPAddress(function(ipInfo) {
                _this.ip = ipInfo.ip;			//note: we could use ipInfo.subnet here but, this could be a 16-bit subnet rather than 24-bit?
                var len =  ipInfo.ip.lastIndexOf('\.') + 1;
                _this.lan = ipInfo.ip.substr(0,len);
                clearTimeout(iptime);
                cb(null);
           });
    },

    
    factoryReset: function() {
        //We have connected to a server OK
        

        
        var _this = this;
        
    		navigator.notification.confirm(
	    		'Are you sure? All your saved PCs and other settings will be cleared.',  // message
	    		function(buttonIndex) {
	    			if(buttonIndex == 1) {
						localStorage.clear();
						
						localStorage.removeItem("usingServer");							//Init it
						localStorage.removeItem("defaultDir");							//Init it
						localStorage.removeItem("currentRemoteServer");
	   					localStorage.removeItem("currentWifiServer");
	   					
	   					localStorage.setItem("initialHash", 'true');					//Default to write a folder
						document.getElementById("always-create-folder").checked = true;
						
						
						//Now refresh the current server display
    					document.getElementById("currentPC").innerHTML = "";
    		
						alert("Cleared all saved PCs.");
		
						glbThis.openSettings();
						
					}
	    		
	    		},                 			 	// callback to invoke
	    		'Clear Settings',            	// title
	    		['Ok','Cancel']             	// buttonLabels
			);
        
		return false;
    },
    

    checkDefaultDir: function(server) {
        //Check if the default server has a default dir eg. input:
        //   http://123.123.123.123:5566/write/fshoreihtskhfv
        //Where the defaultDir would be 'fshoreihtskhfv'
        //Returns '{ server: "http://123.123.123.123:5566", dir: "fshoreihtskhfv"'
        var requiredStr = "/write/";
        var startsAt = server.indexOf(requiredStr);
        if(startsAt >= 0) {
            //Get the default dir after the /write/ string
            var startFrom = startsAt + requiredStr.length;
            var defaultDir = server.substr(startFrom);
            var properServer = server.substr(0, startsAt);
            return { server: properServer, dir: defaultDir };
        } else {
            return { server: server, dir: "" };
        }

    },


	connect: function(results) {
		
    	//Save the server with a name
    	//Get existing settings array    	
    	switch(results.buttonIndex) {
    	
    		case 1:
    			//Clicked on 'Ok'
    			//Start the pairing process
    			var pairUrl = centralPairingUrl + '?compare=' + results.input1;
			   		glbThis.notify("Pairing..");
			   		glbThis.get(pairUrl, function(url, resp) {

						if(resp) {		
						   	resp = resp.replace('\n', '')

					   		if(resp == 'nomatch') {
								glbThis.notify("Sorry, there was no match for that code.");
								return;

					   		} else {

								
								var server = resp;
								
								glbThis.notify("Pairing success.");
								
								//And save this server
								localStorage.setItem("currentRemoteServer",server);
								localStorage.removeItem("currentWifiServer");  				//Clear the wifi
								localStorage.removeItem("usingServer");						//Init it
								localStorage.removeItem("defaultDir");						//Init it


								  navigator.notification.confirm(
									'Do you want to connect via WiFi, if it is available, also?',  // message
									function(buttonIndex) {
										if(buttonIndex == 1) {
											//yes, we also want to connect via wifi
											glbThis.checkWifi(function(err) {
												if(err) {
													//An error finding wifi
													glbThis.notify(err);
													glbThis.bigButton();
												} else {
													//Ready to take a picture, rerun with this
													//wifi server
													glbThis.notify("WiFi paired successfully.");
													glbThis.bigButton();
												}
											});
										} else {
											glbThis.notify("Pairing success, without WiFi.");
											glbThis.bigButton();
										}
						
									},                  			// callback to invoke
									'Pairing Success!',            	// title
									['Yes','No']             		// buttonLabels
								);
								
			  
								return;
					   		}
					   	} else {
					   		//A 404 response
					   		glbThis.notify("Sorry, we could not connect to the pairing server. Please try again.");
					   	}

			   	}); //end of get
    			
    			return;
    		break;
    	
    		case 2:
    			//Clicked on 'Wifi only'
    			//Otherwise, first time we are running the app this session	
    			localStorage.removeItem("currentWifiServer");  			//Clear the wifi
				localStorage.removeItem("currentRemoteServer");  		//Clear the wifi
				localStorage.removeItem("usingServer");					//Init it
				localStorage.removeItem("defaultDir");					//Init it
				
				glbThis.checkWifi(function(err) {
					if(err) {
						//An error finding server - likely need to enter a pairing code. Warn the user
						glbThis.notify(err);
					} else {
						//Ready to take a picture, rerun
						glbThis.notify("Wifi paired successfully.");
						
						glbThis.bigButton();
					}
				});
				
				return;
    		break;
    		
    		default:
    			//Clicked on 'Cancel'
    		
    		break;
    	
		}
	},

    bigButton: function() {

        //Called when pushing the big button
        
        var _this = this;

       var foundRemoteServer = null;
       var foundWifiServer = null;
	   foundRemoteServer = localStorage.getItem("currentRemoteServer");
	   foundWifiServer = localStorage.getItem("currentWifiServer");


		if(((foundRemoteServer == null)||(foundRemoteServer == ""))&&
		    ((foundWifiServer == null)||(foundWifiServer == ""))) {
		    
				//Likely need to enter a pairing code. Warn the user
				//No current server - first time with this new connection

				//We have connected to a server OK
				navigator.notification.prompt(
					'Please enter the 4 letter pairing code from your PC.',  	// message
					glbThis.connect,                  						// callback to invoke
					'New Connection',            								// title
					['Ok','Use Wifi Only','Cancel'],             				// buttonLabels
					''                 											// defaultText
				);
		} else {
			//Ready to take a picture
		    _this.takePicture();			
		}

		



    },


	checkWifi: function(cb) {
	    glbThis.notify("Checking Wifi connection");

       this.getip(function(ip, err) {

          if(err) {
             cb(err);
             return;
          }

          glbThis.notify("Scanning Wifi");

          glbThis.scanlan('5566', function(url, err) {

             if(err) {
               cb(err);
             } else {
               cb(null);
             }

          });
       });
	
	},

	
	getOptions: function(guid, cb) {
		//Input a server dir e.g. uPSE4UWHmJ8XqFUqvf
		//   where the last part is the guid.
		
		//Get a URL like this: https://atomjump.com/med-settings.php?type=get&guid=uPSE4UWHmJ8XqFUqvf
		//to get a .json array of options.
		
		var settingsUrl = "https://atomjump.com/med-settings.php?type=get&guid=" + guid;
		
		glbThis.get(settingsUrl, function(url, resp) {
			
			if(resp != "") {
				
				var options = JSON.stringify(resp);		//Or is it without the json parsing?
				
				if(options) {
					//Set local storage
					//localStorage.removeItem("serverOptions");
					localStorage.setItem("serverOptions", options);
					cb(null);
				} else {
					cb("No options");
				}
			} else {
				cb("No options");
			}
		});
	
	},
	
	clearOptions: function() {
		localStorage.removeItem("serverOptions");
	},

    findServer: function(cb) {

	   //Check storage for any saved current servers, and set the remote and wifi servers
	   //along with splitting any subdirectories, ready for use by the the uploader.
	   //Then actually try to connect - if wifi is an option, use that first
       var _this = this;
       
       var alreadyReturned = false;
       var found = false;
       
       //Clear off
       var foundRemoteServer = null;
       var foundWifiServer = null;
       var foundRemoteDir = null;
       var foundWifiDir = null;
       var usingServer = null;
       
       this.clearOptions();
       
       //Early out
       usingServer = localStorage.getItem("usingServer");
       
       
       
       if((usingServer)&&(usingServer != null)) {
       
       		cb(null);
       		return;
       	
       }
       
       
	   foundRemoteServer = localStorage.getItem("currentRemoteServer");
	   foundWifiServer = localStorage.getItem("currentWifiServer");
	   
	   
	   if((foundRemoteServer)&&(foundRemoteServer != null)&&(foundRemoteServer != "")) {
	   		//Already found a remote server
	   		//Generate the directory split, if any. Setting RAM foundServer and defaultDir
	   		var split = this.checkDefaultDir(foundRemoteServer);
	   		foundRemoteServer = split.server;
	   		foundRemoteDir = split.dir;		
	   } else {
	   		foundRemoteServer = null;
	   		foundRemoteDir = null;
	   }

   	    //Check if we have a Wifi option		
	   if((foundWifiServer)&&(foundWifiServer != null)&&(foundWifiServer != "")) {
			//Already found wifi
			//Generate the directory split, if any. Setting RAM foundServer and defaultDir
			var split = this.checkDefaultDir(foundWifiServer);
	   		foundWifiServer = split.server;
	   		foundWifiDir = split.dir;	

	   } else {
	   		foundWifiServer = null;
	   		foundWifiDir = null;
	   }
	   
	   

	   //Early out:
	   if((foundWifiServer == null)&&(foundRemoteServer == null)) {
	   		cb('No known server.');
	   		return;
	   }

	   
	   //Now try the wifi server as the first option to use if it exists:
	   if((foundWifiServer)&&(foundWifiServer != null)&&(foundWifiServer != "null")) {
	   	  //Ping the wifi server
	   	  glbThis.notify('Trying to connect to the wifi server..');
	   	  
	   	  //Timeout after 5 secs for the following ping
       	  var scanning = setTimeout(function() {
                
                
                glbThis.notify('Timeout finding your wifi server.</br>Trying remote server..');
                
                //Else can't communicate with the wifi server at this time.
	   	  	    //Try the remote server
	   	  	  	if((foundRemoteServer)&&(foundRemoteServer != null)&&(foundRemoteServer != "null")) {
	   	  	  		
	   	  	  		var scanningB = setTimeout(function() {
	   	  	  			//Timed out connecting to the remote server - that was the
	   	  	  			//last option.
	   	  	  			localStorage.removeItem("usingServer");
	   	  	  			localStorage.removeItem("defaultDir");
	   	  	  			localStorage.removeItem("serverRemote");
	   	  	  			
	   	  	  			if(alreadyReturned == false) {
	   	  	  				alreadyReturned = true;
	   	  	  				cb('No server found');
	   	  	  			}
	   	  	  		
	   	  	  		}, 6000);
	   	  	  		
	   	  	  		glbThis.get(foundRemoteServer, function(url, resp) {
	   	  	  		
	   	  	  		    if(resp != "") {
							//Success, got a connection to the remote server
							
							clearTimeout(scanningB);		//Ensure we don't error out
							localStorage.setItem("usingServer", foundRemoteServer);
							localStorage.setItem("serverRemote", 'true');
							localStorage.setItem("defaultDir", foundRemoteDir);
						
				
							 if(alreadyReturned == false) {
								 alreadyReturned = true;
						 
						 		 //Get any global options
        						 glbThis.getOptions(foundRemoteDir);
						 
								 cb(null);	
					
							 }	
							 
							 clearTimeout(scanning);		//Ensure we don't error out
						}	   	  	  				
	   	  	  			
	   	  	  		});
	   	  	  		
	   	  	  	} else {
                	//Only wifi existed	   	  	  			
                	localStorage.removeItem("usingServer");
                	localStorage.removeItem("defaultDir");
                	localStorage.removeItem("serverRemote");
                	if(alreadyReturned == false) {
                		alreadyReturned = true;
                		cb('No server found');
                	}
                		
            	}
                
       	   }, 2000);
	   	  
	   	  //Ping the wifi server
	   	  glbThis.get(foundWifiServer, function(url, resp) {
	   	  	  
	   	  	  if(resp != "") {
	   	  	  
				  //Success, got a connection to the wifi
				  clearTimeout(scanning);		//Ensure we don't error out
				  localStorage.setItem("usingServer", foundWifiServer);
				  localStorage.setItem("defaultDir", foundWifiDir);	
				  localStorage.setItem("serverRemote", 'false');				
		  
				   	
		  
				  if(alreadyReturned == false) {
					  alreadyReturned = true;
					  					  
					  cb(null);					//Success found server
				  }
			  }
	   	  
	   	  });
	   
	   } else {
	   		//OK - no wifi option - go straight to the remote server
	   		//Try the remote server
	   		glbThis.notify('Trying to connect to the remote server....');
	   		
	   		var scanning = setTimeout(function() {
	   	  	  			//Timed out connecting to the remote server - that was the
	   	  	  			//last option.
	   	  	  			localStorage.removeItem("usingServer");
	   	  	  			localStorage.removeItem("defaultDir");
	   	  	  			localStorage.removeItem("serverRemote");
	   	  	  			
	   	  	  			if(alreadyReturned == false) {
	   	  	  				alreadyReturned = true;
	   	  	  				cb('No server found');
	   	  	  			}
	   	  	  		
	   	  	  		}, 6000);
	   		
			_this.get(foundRemoteServer, function(url, resp) {
				
				if(resp != "") {
					//Success, got a connection to the remote server
					localStorage.setItem("usingServer", foundRemoteServer);
					localStorage.setItem("defaultDir", foundRemoteDir);
				    localStorage.setItem("serverRemote", 'true');
				
				    
        			
				
					if(alreadyReturned == false) {
						alreadyReturned = true;
						
						//Get any global options
        				glbThis.getOptions(foundRemoteDir);
        				
						cb(null);	
					
					}
					
					clearTimeout(scanning);		//Ensure we don't error out

				}
			});
	   
	   
	   }





    },
    
    
    
    
    /* Settings Functions */ 
    
    openSettings: function() {
    	//Open the settings screen
    	var html = this.listServers();
    	document.getElementById("settings").innerHTML = html;
    	
    	document.getElementById("settings-popup").style.display = "block";
    	
    },
    
    closeSettings: function() {
    	//Close the settings screen
    	document.getElementById("settings-popup").style.display = "none";
    },

    listServers: function() {
    	//List the available servers
    	var settings = this.getArrayLocalStorage("settings");
    	
    	
    	if(settings) {
	    	var html = "<ons-list><ons-list-header>Select a PC to use now:</ons-list-header>";
	    	
	    	//Convert the array into html
	    	for(var cnt=0; cnt< settings.length; cnt++) {
	    		html = html + "<ons-list-item><ons-list-item onclick='app.setServer(" + cnt + ");'>" + settings[cnt].name + "</ons-list-item><div class='right'><ons-icon icon='md-delete' onclick='app.deleteServer(" + cnt + ");'></ons-icon></div></ons-list-item>";
	    	}
	    	
	    	html = html + "</ons-list>";
    	} else {
    		var html = "<ons-list><ons-list-header>PCs Stored</ons-list-header>";
    		var html = html + "<ons-list-item><ons-list-item>Default</ons-list-item><div class='right'><ons-icon icon='md-delete'style='color:#AAA></ons-icon></div></ons-list-item>";
    		html = html + "</ons-list>";
    	}
    	return html;
    },
    
    
    
    setServer: function(serverId) {
    	//Set the server to the input server id
    	var settings = this.getArrayLocalStorage("settings");
    
    	var currentRemoteServer = settings[serverId].currentRemoteServer;			
        var currentWifiServer = settings[serverId].currentWifiServer;	
 
        localStorage.removeItem("usingServer"); //reset the currently used server
       
        //Save the current server
        localStorage.removeItem("defaultDir");
        
        //Remove if one of these doesn't exist, and use the other.
        if((!currentWifiServer)||(currentWifiServer == null)||(currentWifiServer =="")) {
        	localStorage.removeItem("currentWifiServer");
        } else {
        	localStorage.setItem("currentWifiServer", currentWifiServer);
        }
        
        if((!currentRemoteServer)||(currentRemoteServer == null)||(currentRemoteServer == "")) {
        	localStorage.removeItem("currentRemoteServer");
        } else {
        	localStorage.setItem("currentRemoteServer", currentRemoteServer);
        }
        
        //Set the localstorage
        localStorage.setItem("currentServerName", settings[serverId].name);
 	
    	
    	navigator.notification.alert("Switched to: " +  settings[serverId].name, function() {}, "Changing PC");
    	
    	//Now refresh the current server display
    	document.getElementById("currentPC").innerHTML = settings[serverId].name;
    	
    	this.closeSettings();
    	return false;
    	
    },
    
    newServer: function() {
    	//Create a new server. 
    	//This is actually effectively resetting, and we will allow the normal functions to input a new one
    	localStorage.removeItem("usingServer");
        
        //Remove the current one
       	localStorage.removeItem("currentRemoteServer");
        localStorage.removeItem("currentWifiServer");

		this.notify("Tap above to activate.");						//Clear off old notifications
        
		//Ask for a name of the current Server:
		navigator.notification.prompt(
			'Please enter a name for this PC',  					// message
			this.saveServerName,                  					// callback to invoke
			'PC Name',            									// title
			['Ok','Cancel'],             							// buttonLabels
			'Main'                 									// defaultText
		);
	
	

    	
    },
    
    deleteServer: function(serverId) {
    	//Delete an existing server
    	this.myServerId = serverId;
    	
    	navigator.notification.confirm(
	    		'Are you sure? This PC will be removed from memory.',  // message
	    		function(buttonIndex) {
	    			if(buttonIndex == 1) {
						var settings = glbThis.getArrayLocalStorage("settings");
    	
						if((settings == null)|| (settings == '')) {
							//Nothing to delete 
						} else {
						
							//Check if it is deleting the current entry
							var deleteName = settings[glbThis.myServerId].name;
							var currentServerName = localStorage.getItem("currentServerName");
    	
    						if((currentServerName) && (deleteName) && (currentServerName == deleteName)) {
    							//Now refresh the current server display
    							document.getElementById("currentPC").innerHTML = "";
    							localStorage.removeItem("currentRemoteServer");
    							localStorage.removeItem("currentWifiServer");
    							localStorage.removeItem("currentServerName");
    						}

						
							settings.splice(glbThis.myServerId, 1);  			//Remove the entry entirely from array
			
							glbThis.setArrayLocalStorage("settings", settings);
						} 
		
						glbThis.openSettings();			//refresh
					}
	    		
	    		},                  						// callback to invoke
	    		'Remove PC',            					// title
	    		['Ok','Cancel']             				// buttonLabels
		);
    	
    	

    },
    

    
    saveServerName: function(results) {
    	//Save the server with a name - but since this is new,
    	//Get existing settings array
    	if(results.buttonIndex == 1) {
    		//Clicked on 'Ok'
    		
    		localStorage.setItem("currentServerName", results.input1);
 
    		//Now refresh the current server display
    		document.getElementById("currentPC").innerHTML = results.input1;
    		
    		glbThis.closeSettings();
    		return;
    	} else {
    		//Clicked on 'Exit'. Do nothing.
     		return;
    	}

     	
    },
    
    displayServerName: function() {
    	//Call this during initialisation on app startup
    	var currentServerName = localStorage.getItem("currentServerName");
    	
    	if((currentServerName) && (currentServerName != null)) {
    		//Now refresh the current server display
    		document.getElementById("currentPC").innerHTML = currentServerName;
    		
    	} else {
    		document.getElementById("currentPC").innerHTML = "";
    	}
    
    
    
    },
    
    
	saveIdInput: function(status) {
    	//Save the idInput. input true/false   true = 'start with a hash'
    	//                                     false = 'start with blank'
    	//Get existing settings array
    	if(status == true) {
    		//Show a hash by default    		
    		localStorage.setItem("initialHash", "true");
    		
    	} else {
    		//Remove the hash by default
     		localStorage.setItem("initialHash", "false");
    		
    	}
    },
    
    
    displayIdInput: function() {
    	//Call this during initialisation on app startup
    	var initialHash = localStorage.getItem("initialHash");
    		
    	if((initialHash) && (initialHash != null)) {
    		//Now refresh the current ID field
    		if(initialHash == "true") {
    			document.getElementById("always-create-folder").checked = true;
    		} else {
    			document.getElementById("always-create-folder").checked = false;
    		}
     	} 
     	
    },
    
    
    
    saveServer: function() {
        	//Run this after a successful upload
        	
        	
        	var currentServerName = localStorage.getItem("currentServerName");        	
        	var currentRemoteServer = localStorage.getItem("currentRemoteServer");
    		var currentWifiServer = localStorage.getItem("currentWifiServer");
   			
   			if((!currentServerName) ||(currentServerName == null)) currentServerName = "Default";
   			if((!currentRemoteServer) ||(currentRemoteServer == null)) currentRemoteServer = "";
   			if((!currentWifiServer) ||(currentWifiServer == null)) currentWifiServer = "";	
   		
   			var settings = glbThis.getArrayLocalStorage("settings");
   			
   			//Create a new entry - which will be blank to being with
   			var newSetting = { 
   				"name": currentServerName,						//As input by the user
   				"currentRemoteServer": currentRemoteServer,
   				"currentWifiServer": currentWifiServer
   			};
   			
   			
   		
   			if((settings == null)|| (settings == '')) {
   				//Creating an array for the first time
   				var settings = [];
   				settings.push(newSetting);  					//Save back to the array
   			} else {
   				//Check if we are writing over the existing entries
   				var writeOver = false;
   				for(cnt = 0; cnt< settings.length; cnt++) {
   					if(settings[cnt].name == currentServerName) {
   						writeOver = true;
   						settings[cnt] = newSetting;
   					}
   				}
   			
   				if(writeOver == false) {
    				settings.push(newSetting);  				//Save back to the array
    			}
   			} 

    		
    		//Save back to the persistent settings
    		glbThis.setArrayLocalStorage("settings", settings);
    		
    		return;
    
    },
    
    //Array storage for app permanent settings (see http://inflagrantedelicto.memoryspiral.com/2013/05/phonegap-saving-arrays-in-local-storage/)
    setArrayLocalStorage: function(mykey, myobj) {
	    return localStorage.setItem(mykey, JSON.stringify(myobj));
    },
    
    getArrayLocalStorage: function(mykey) {
	    return JSON.parse(localStorage.getItem(mykey));
    }

};
