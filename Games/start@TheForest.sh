#!/bin/bash
source "./start@~.sh"
echo -e "TheForest Server"

SOURCE_PATH="$STEAM_PATH/SteamApps/common/TheForestDedicatedServer"

APP_ID=556450
APP_PLATFORM="windows"

STEAM_USERNAME="anonymous"

# https://steamcommunity.com/sharedfiles/filedetails/?id=907906289
SERVER_CONFIGFILEPATH=
SERVER_SAVEFOLDERPATH=


if ! setWorkingDirectory "./TheForest";
then
    exit 1
fi

findInstances

if ! printInstances;
then
    exit 1
fi

if ! chooseInstance;
then
    exit 1
fi

if ! loadInstance;
then
    exit 1
fi

NAME="TheForest@$INSTANCE_NAME"

if checkScreenInstanceExists "$NAME";
then
    exit 1
fi

if [[ "$*" == *-noupdate* ]];
then
    echo -e "\nSkipping update."
else
    updateApp
fi

if checkScreenInstanceExists "$NAME";
then
    exit 1
fi

# Wine is required to run the server
if ! command -v wine &> /dev/null;
then
    echo -e "\nWine is not installed. Performing installation."

    if ! installPackages "wine";
    then
        exit 1
    fi
fi
# Xvfb is required to run the server
if ! command -v xvfb-run &> /dev/null;
then
    echo -e "\nXvfb is not installed. Performing installation."

    if ! installPackages "xvfb";
    then
        exit 1
    fi
fi

ln -sf "$SOURCE_PATH" "./App"
cd "$SOURCE_PATH"

startScreenInstance "$NAME" "xvfb-run" \
    --auto-servernum \
    --server-args="-screen 0 640x480x24:32" \
    "wine $SOURCE_PATH/TheForestDedicatedServer.exe" \
    -configfilepath "$SERVER_CONFIGFILEPATH" \
    -savefolderpath "$SERVER_SAVEFOLDERPATH" \
    -batchmode \
    -nographics

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
