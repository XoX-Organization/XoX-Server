#!/bin/bash
source "./start@~.sh"
echo -e "Valheim Server"

SOURCE_PATH="$STEAM_PATH/steamapps/common/Valheim"

APP_ID=892970

SERVER_NAME=
SERVER_PORT=
SERVER_PASSWORD=
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

ln -s "$HOME/.config/unity3d/IronGate/Valheim" "./Local"
ln -s "$SOURCE_PATH" "./App"
cd "$SOURCE_PATH"

startScreenInstance "$NAME" "${SOURCE_PATH}/valheim_server.x86_64" \
    -name "$SERVER_NAME" \
    -port "$SERVER_PORT" \
    -password "$SERVER_PASSWORD" \
    -world "$SERVER_WORLDFILENAME" \
    -public 0 \
    -nographics \
    -batchmode \
    -crossplay

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
