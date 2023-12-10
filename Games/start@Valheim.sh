#!/bin/bash
source "./start@~.sh"
echo -e "Valheim Server"

SOURCE_PATH="$STEAM_PATH/SteamApps/common/Valheim dedicated server"

APP_ID=896660
APP_BETA_BRANCH="none"

STEAM_USERNAME="anonymous"

SERVER_NAME="XoX eSports Valheim Server"
SERVER_PORT="2456"
SERVER_PASSWORD="xoxsince2020"
SERVER_WORLDFILENAME=

if ! setWorkingDirectory "./Valheim";
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

NAME="Valheim@$INSTANCE_NAME"

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

symlink "$HOME/.config/unity3d/IronGate/Valheim" "./Local"
symlink "$SOURCE_PATH" "./App"
cd "$SOURCE_PATH"

startScreenInstance "$NAME" \
    "
    export templdpath=\$LD_LIBRARY_PATH;
    export LD_LIBRARY_PATH=./linux64:\$LD_LIBRARY_PATH;
    export SteamAppId=892970;
    \"${SOURCE_PATH}/valheim_server.x86_64\" \
        -name \"$SERVER_NAME\" \
        -port \"$SERVER_PORT\" \
        -password \"$SERVER_PASSWORD\" \
        -world \"$SERVER_WORLDFILENAME\" \
        -public 1 \
        -nographics \
        -batchmode \
        -crossplay;
    export LD_LIBRARY_PATH=\$templdpath
    "

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
