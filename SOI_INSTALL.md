# Installation Instructions

### Prerequisites

 - [sealog-server (soi branch) ](https://github.com/schmidtocean/sealog-server)
 - [nodeJS v20.x+](https://nodejs.org)
 - [git](https://git-scm.com)
 - Apache2 Webserver (alternatively NGINX can be used)
 
#### Installing NodeJS/npm on Ubuntu 22.04 LTS

Download the nvm install script:
```
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
Install the LTS version of NodeJS using `nvm`
```
nvm install --lts
sudo ln -s $HOME/.nvm/versions/node/v20.11.0/bin/npm /usr/local/bin/
sudo ln -s $HOME/.nvm/versions/node/v20.11.0/bin/node /usr/local/bin/
```
### Clone the sealog-Sub branch of the SOI repository

```
git clone -b sealog-Sub https://github.com/schmidtocean/sealog-client-vehicle.git ~/sealog-client-Sub
```

This should clone the repo to a directory called `~/sealog-client-Sub`

### Create a new configuration file

```
cd ~/sealog-client-Sub
cp ./src/client_config.js.dist ./src/client_config.js
```

### Modify the configuration file

Set the `API_ROOT_URL`, `WS_ROOT_URL` values in the `./sealog-client-Sub/src/client_config.js` file to match the target server environment.

### Create a deployment file
```
cd ~/sealog-client-Sub
cp ./webpack.config.js.dist ./webpack.config.js
```

### Create a new map tiles file
```
cd ~/sealog-client-Sub
cp ./src/map_tilelayers.js.dist ./src/map_tilelayers.js
```

### If deploying to the ship or the development environment FOR THE FIRST TIME, move the repo to the installation directory (/opt). This step is not necessary if doing local development.
```
sudo mv ~/sealog-client-Sub /opt
```

### Install the nodeJS modules
From a terminal run:
```
cd /opt/sealog-client-Sub
npm install
```
**Note:** if doing local development you will `cd` to where the repo lives on your local machine


### Build the client
From a terminal run:
```
cd /opt/sealog-client-Sub
npm run build
```
**Note:** if doing local development you will `cd` to where the repo lives on your local machine

This will create the `dist` directory containing the required html, js, css, images, and fonts.

### Configure Apache to host the client

**Note:** This step does NOT apply for local development.  See "Running in development mode" below.

Add the following to your Apache vhosts file (i.e. `/etc/apache2/sites-available/000-default.conf`).  Modify the path appropriately for your installation. This example assumes the client will live at `http://<serverIP>/sealog`:
```
  <Directory "/var/www/html/sealog">
    Options +Indexes +FollowSymLinks
    RewriteEngine on
  
    # Don't rewrite files or directories
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    
    # Rewrite everything else to index.html to allow html5 state links
    RewriteRule ^ index.html [L]
  </Directory>
```

Create a symbolic link from the dist directory to the directory where Apache will server the client.  Modify the paths appropriately for your installation.  This example assumes the client will live at `http://<serverIP>/sealog` and the git repo is located at: `/opt/sealog-client-Sub`:
```
sudo ln -s /opt/sealog-client-Sub/dist /var/www/html/sealog`
```

**Be sure to reload Apache for these changes to take affect.**
`sudo service apache2 reload`

### Updating client in Production/Development environments from Repo

`cd` to repo location on target environment.
`git pull` to retrieve the code updates
`npm run build` to build the updated client from repo.

This should build and automatically install the client on the target environment HOWEVER you will most likely need to clear the browser cache to load the updated client. 

### Running in development mode ###
Optionally you can run the client using node's development web-server.  This removes the need to run Apache however the client will only be accessable from the local machine.

To run the client using development mode run the following commands in terminal:
```
cd ~/sealog-client-Sub
npm start
```
The client should now be accessible from http://localhost:8080/sealog
