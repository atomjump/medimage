<img src="http://medimage.co.nz/wp-content/uploads/2018/04/icon-60.png">

# MedImage App

This app allows a medical doctor to take a photo with their iPhone or Android phone, and transfer the image
securely to their desktop system, which has the MedImage Server installed on it.

# Requirements

The project was originally built with the PhoneGap Build tool.
However, since that tool has been removed, a migration has started to occur
to Apache Cordova, which is fundamentally the same system. 

The desktop system should have the MedImage Server at https://github.com/atomjump/medimageserv installed first.


# Branches and Status


## Browser version

This is now the primary version of the app, and the app-store versions have been depreciated.

Required: You will need "npm" and "nodejs" to be installed, which should be there after a MedImage Server Windows installation

Install in a command box with:
```
npm install -g cordova  
cordova platform add browser
cordova build browser
cordova run browser
```

Then you can access your app from within a browser on port 8000 e.g.

```
http://localhost:8000
```

Optional: You may want to open your firewall to port 8000, to allow access over the LAN.

Optional: You may want to use an Apache Proxy to get port 8000 running from a :443 SSL domain.



## App-store apps

These have now been depreciated.

The 'android' branch is for Android phones, while the 'master-ios' branch is for iPhones. There are subtle differences (e.g. com.phonegap.medimage for iOS vs com.atomjump.medimage for Android), but care should be taken to keep shared code changes reflected across, as much as possible, between the two code-bases.
On iOS, you will need distribution keys.

Current status:

* Builds successfully on Android. Sends across a blank 0 byte image. It does not register as being connected to Wifi. Camera incorrectly starts with front-facing camera each time.
* Build failures on iOS. Seems to be problems with versions of the cordova-plugin-file-transfer library and cordova-plugin-dialogs at this stage.
* Note for AtomJump internal developers: since we don't have the original Phonegap certificate, a completely new app will need to be released, and old users migrated to it, turning the old app into a 'Legacy' version. We have a placeholder on the Google appstore as "MedImage (Experimental)", which will eventually become "MedImage". 


## Notes

* Switching over from filetransfer to HTML5
https://cordova.apache.org/blog/2017/10/18/from-filetransfer-to-xhr2.html

## Future work

* Update the MedImage app icon on the browser edition.

* Package this up into a MedImage add-on as a .zip or .exe file.

# License

Application source code copyright (c) 2021 AtomJump Ltd. (New Zealand). All rights reserved.


Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.



