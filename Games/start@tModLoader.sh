#!/bin/bash
source "./start@~.sh"
echo -e "Terraria Server - tModLoader"

SOURCE_PATH="$STEAM_PATH/SteamApps/common/tModLoader"

APP_ID=1281930

SERVER_CONFIGFILEPATH=
SERVER_SAVEFOLDERPATH=

if ! setWorkingDirectory "./tModLoader";
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

NAME="TML@$INSTANCE_NAME"

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

# Copy "enabled.json" to "enabled.json.constant" to prevent tModLoader from updating it
printHeader "Backing up enabled.json"

if [ ! -e "$SERVER_SAVEFOLDERPATH/Mods/enabled.json.constant" ];
then
    cp "$SERVER_SAVEFOLDERPATH/Mods/enabled.json" "$SERVER_SAVEFOLDERPATH/Mods/enabled.json.constant"
fi

rm "$SERVER_SAVEFOLDERPATH/Mods/enabled.json"
cp "$SERVER_SAVEFOLDERPATH/Mods/enabled.json.constant" "$SERVER_SAVEFOLDERPATH/Mods/enabled.json" > /dev/null 2>&1
echo -e "Done."

if checkScreenInstanceExists "$NAME";
then
    exit 1
fi

symlink "$HOME/.local/share/Terraria/tModLoader" "./Local"
symlink "$SOURCE_PATH" "./App"
cd "$SOURCE_PATH"

startScreenInstance "$NAME" \
    "
    \"${SOURCE_PATH}/start-tModLoaderServer.sh\" \
    -nosteam \
    -config \"$SERVER_CONFIGFILEPATH\" \
    -tmlsavedirectory \"$SERVER_SAVEFOLDERPATH\" \
    -steamworkshopfolder none
    "

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
