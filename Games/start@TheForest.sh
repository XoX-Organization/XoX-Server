#!/bin/bash
source "./start@~.sh"
echo -e "TheForest Server"

APP_ID=556450
APP_PLATFORM="windows"

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

cd "$SOURCE_PATH"

startScreenInstance "$NAME" ""

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
