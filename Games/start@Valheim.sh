#!/bin/bash
source "./start@~.sh"
echo -e "Valheim Server"

APP_ID=892970
SOURCE_PATH="$HOME/.steam/steam/steamapps/common/Valheim dedicated server"

SERVER_NAME=
SERVER_PORT=
SERVER_WORLD=
SERVER_PASSWORD=

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

cd "$SOURCE_PATH"

startScreenInstance "$NAME" "${SOURCE_PATH}/valheim_server.x86_64" \
    -name "$SERVER_NAME" \
    -port "$SERVER_PORT" \
    -world "$SERVER_WORLD" \
    -password "$SERVER_PASSWORD" \
    -public 0 \
    -nographics \
    -batchmode \
    -crossplay

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
