#!/bin/bash
source "./start@~.sh"
echo -e "Terraria Server - tModLoader"

APP_ID=1281930

TML_CONFIG=
TML_SAVE_DIR=
TML_SOURCE_DIR=

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
    echo -e "\nSkipping TML update."
else
    updateApp
fi

# Copy "enabled.json" to "enabled.json.constant" to prevent tModLoader from updating it
printHeader "Backing up enabled.json"

if [ ! -e "$TML_SAVE_DIR/Mods/enabled.json.constant" ];
then
    cp "$TML_SAVE_DIR/Mods/enabled.json" "$TML_SAVE_DIR/Mods/enabled.json.constant"
fi

rm "$TML_SAVE_DIR/Mods/enabled.json"
cp "$TML_SAVE_DIR/Mods/enabled.json.constant" "$TML_SAVE_DIR/Mods/enabled.json" > /dev/null 2>&1
echo -e "Done."

if checkScreenInstanceExists "$NAME";
then
    exit 1
fi

startScreenInstance "$NAME" "${TML_SOURCE_DIR}/start-tModLoaderServer.sh" \
    -nosteam \
    -config "$TML_CONFIG" \
    -tmlsavedirectory "$TML_SAVE_DIR" \
    -steamworkshopfolder none

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
