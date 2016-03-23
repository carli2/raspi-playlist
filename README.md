# Raspberry Pi Playlist manager

[![Corporate Design of a Hotel on Raspberry Pi](http://img.youtube.com/vi/9PPs46tMqFo/0.jpg)](http://www.youtube.com/watch?v=9PPs46tMqFo)

Watch it in youtube: https://www.youtube.com/watch?v=9PPs46tMqFo

[![Launix Videobox introducery video](http://img.youtube.com/vi/jDpMd47FJgM/0.jpg)](http://www.youtube.com/watch?v=jDpMd47FJgM)

Watch it in youtube: https://www.youtube.com/watch?v=jDpMd47FJgM

## Historical background

![Raspberry Pi Playlist at Haus Hertrud in Jonsdorf/Germany](ergebnis.png)

This OpenSource project is originated from a commercial project with the following changes made:
- All texts of the UI were translated to english
- `web/layout` was stripped such that the corporate design of the hotel is not opensourced. You have to adjust the CSS to your needs.
- client/ only contains binaries for raspberry pi and x86-64. The source code also contains IP from other projects and lot of legacy code. If you want to improve the display client, implement your own version and file a merge request. To figure out how it works, look at index.js paths `/playlist/get` and `/playlist/public.php`
- no SD card image available (because we stripped the hotel's corporate identity)

## Installation

- run `npm install`
- `git clone https://github.com/piksel/phantomjs-raspberrypi.git` and link the executable to `/usr/bin`
- start the server with `node index.js`
- start the client with `./client/ledscreen_raspi http://localhost:3000/playlist/get`
- browse to localhost:3000/ and have fun

## TODO's after opensourcing

The project has not yet the quality required for a OpenSource project (because it just fullfills all requirements for our customer). The following things have to be done:
- Internationalize all texts and put them into a .po file
- Generalize web/layout such that multiple corporate designs can be used
- Rewrite the display client using GLES for smoother transitions and preloaded next-image
- make the UI more clear
- create SD card images
