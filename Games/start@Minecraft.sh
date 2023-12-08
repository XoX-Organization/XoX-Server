#!/bin/bash
source "./start@~.sh"
echo -e "Minecraft Server"

SERVER_WORKING_DIRECTORY=

# The Minecraft Java version, ex. "1.16.5" "1.20.1"
MINECRAFT_VERSION=
# Either "forge" or "fabric"
SERVER_LOADER_TYPE=
# The Forge or Fabric version, ex. "47.1.3" "latest" "recommended"
SERVER_LOADER_VERSION="recommended"

# Variables for JVM arguments
SERVER_MAX_RAM="6G"
SERVER_MIN_RAM="2G"
SERVER_JVM_ARGUMENTS=(
    "-server" \
    "-XX:+AggressiveOpts" \
    "-XX:ParallelGCThreads=3" \
    "-XX:+UseConcMarkSweepGC" \
    "-XX:+UnlockExperimentalVMOptions" \
    "-XX:+UseParNewGC" \
    "-XX:+ExplicitGCInvokesConcurrent" \
    "-XX:MaxGCPauseMillis=10" \
    "-XX:GCPauseIntervalMillis=50" \
    "-XX:+UseFastAccessorMethods" \
    "-XX:+OptimizeStringConcat" \
    "-XX:NewSize=84m" \
    "-XX:+UseAdaptiveGCBoundary" \
    "-XX:NewRatio=3"
)

getForgeLatestVersion() {
    FORGE_LATEST_VERSION=$(echo "$1" | awk '/<i class="fa promo-latest"/ {getline; print}' | sed -n 's/.*<small>\(.*\)<\/small>.*/\1/p')
    echo $(echo $FORGE_LATEST_VERSION | cut -d '-' -f 2 | tr -d ' ')
}

getForgeRecommendedVersion() {
    FORGE_RECOMMENDED_VERSION=$(echo "$1" | awk '/<i class="fa promo-recommended"/ {getline; print}' | sed -n 's/.*<small>\(.*\)<\/small>.*/\1/p')
    echo $(echo $FORGE_RECOMMENDED_VERSION | cut -d '-' -f 2 | tr -d ' ')
}

refreshVariables() {
    printHeader "Refreshing Variables"

    if [ -z "$MINECRAFT_VERSION" ];
    then
        echo -e "No Minecraft version provided. Please provide a Minecraft version to continue."
        return 1
    fi

    if [ -z "$SERVER_LOADER_TYPE" ];
    then
        echo -e "No server loader type provided. Please provide a server loader type to continue."
        return 1
    fi

    # If the server loader version is "latest" or "recommended", then get the latest or recommended version from the Forge website
    if [ "$SERVER_LOADER_VERSION" == "latest" ] || [ "$SERVER_LOADER_VERSION" == "recommended" ];
    then
        FORGE_WEBSITE_URL="https://files.minecraftforge.net/net/minecraftforge/forge/index_$MINECRAFT_VERSION.html"
        FORGE_WEBSITE_HTML=$(wget -qO- "$FORGE_WEBSITE_URL")

        if [ $? -ne 0 ];
        then
            echo -e "Failed to access the Forge website. $FORGE_WEBSITE_URL"
            return 1
        fi

        if [ "$SERVER_LOADER_VERSION" == "latest" ];
        then
            SERVER_LOADER_VERSION=$(getForgeLatestVersion "$FORGE_WEBSITE_HTML")

        elif [ "$SERVER_LOADER_VERSION" == "recommended" ];
        then
            SERVER_LOADER_VERSION=$(getForgeRecommendedVersion "$FORGE_WEBSITE_HTML")

            if [ -z "$SERVER_LOADER_VERSION" ];
            then
                echo -e "No recommended Forge version found. Proceeding to use latest version.\n\n"
                SERVER_LOADER_VERSION=$(getForgeLatestVersion "$FORGE_WEBSITE_HTML")
            fi
        fi
    fi

    FORGE_JAR_PATH="libraries/net/minecraftforge/forge/$MINECRAFT_VERSION-$SERVER_LOADER_VERSION"
    FORGE_SERVER_JAR="forge-$MINECRAFT_VERSION-$SERVER_LOADER_VERSION-server.jar"
    FORGE_SERVER_JAR_PATH="$FORGE_JAR_PATH/$FORGE_SERVER_JAR"
    FORGE_UNIVERSAL_JAR="forge-$MINECRAFT_VERSION-$SERVER_LOADER_VERSION-universal.jar"
    FORGE_UNIVERSAL_JAR_PATH="$FORGE_JAR_PATH/$FORGE_UNIVERSAL_JAR"

    # For older Minecraft version (ex. 1.12.2), the server jar path is different
    FORGE_LEGACY_JAR="forge-$MINECRAFT_VERSION-$SERVER_LOADER_VERSION.jar"

    FORGE_INSTALLER_JAR="forge-$MINECRAFT_VERSION-$SERVER_LOADER_VERSION-installer.jar"
    FORGE_DOWNLOAD_URL="http://files.minecraftforge.net/maven/net/minecraftforge/forge/$MINECRAFT_VERSION-$SERVER_LOADER_VERSION/$FORGE_INSTALLER_JAR"

    FORGE_USER_JVM_ARGS_FILE="user_jvm_args.txt"

    FORGE_UNIX_ARGS_FILE="unix_args.txt"
    FORGE_UNIX_ARGS_FILE_PATH="$FORGE_JAR_PATH/$FORGE_UNIX_ARGS_FILE"

    echo -e "Variables refreshed."
}

printVariables() {
    printHeader "Variables"

    echo -e "Minecraft Version: $MINECRAFT_VERSION"
    echo -e "Server Loader Type: $SERVER_LOADER_TYPE"
    echo -e "Server Loader Version: $SERVER_LOADER_VERSION"
    echo -e "Forge Jar Path: $FORGE_JAR_PATH"
    echo -e "Forge Server Jar: $FORGE_SERVER_JAR"
    echo -e "Forge Server Jar Path: $FORGE_SERVER_JAR_PATH"
    echo -e "Forge Universal Jar: $FORGE_UNIVERSAL_JAR"
    echo -e "Forge Universal Jar Path: $FORGE_UNIVERSAL_JAR_PATH"
    echo -e "Forge Installer Jar: $FORGE_INSTALLER_JAR"
    echo -e "Forge Download URL: $FORGE_DOWNLOAD_URL"
    echo -e "Forge User JVM Args File: $FORGE_USER_JVM_ARGS_FILE"
    echo -e "Forge Unix Args File: $FORGE_UNIX_ARGS_FILE"
    echo -e "Forge Unix Args File Path: $FORGE_UNIX_ARGS_FILE_PATH"

    echo -e "Server Max RAM: $SERVER_MAX_RAM"
    echo -e "Server Min RAM: $SERVER_MIN_RAM"
}

updateUserJvmArgs() {
    printHeader "Updating User JVM Arguments"

    if [ ! -f "$FORGE_USER_JVM_ARGS_FILE" ];
    then
        touch "$FORGE_USER_JVM_ARGS_FILE"
    fi

    for arg in "${SERVER_JVM_ARGUMENTS[@]}";
    do
        found=0
        while IFS= read -r line;
        do
            [[ "$line" == "$arg" || "$line" == "#$arg" ]] && found=1
        done < "$FORGE_USER_JVM_ARGS_FILE"

        if [[ $found -eq 0 ]];
        then
            echo -e "Adding JVM argument: $arg"
            echo -e "\n$arg" >> "$FORGE_USER_JVM_ARGS_FILE"
        fi
    done

    echo -e "User JVM arguments updated."
}

cleanUserJvmArgs() {
    printHeader "Cleaning User JVM Arguments"

    while true;
    do
        output=$(java @user_jvm_args.txt -version 2>&1)
        if [[ $output == *"Unrecognized VM option"* ]];
        then
            # Extract the unrecognized option
            unrecognized_option=$(echo $output | grep -o "Unrecognized VM option '[^']*'" | cut -d "'" -f 2)
            # Comment out the unrecognized option in user_jvm_args.txt
            sed -i "/$unrecognized_option/s/^/#/" user_jvm_args.txt
            echo -e "Unrecognized option: $unrecognized_option"
        else
            # No more unrecognized options, break the loop
            break
        fi
    done

    echo -e "User JVM arguments is clean."
}

printUserJvmArgs() {
    printHeader "User JVM Arguments"

    while read -r line; do
        # Ignore comments and empty lines
        if [[ ! "$line" =~ ^# && ! -z "$line" ]]; then
            echo -e "$line"
        fi
    done < "$FORGE_USER_JVM_ARGS_FILE"
}

acceptEula() {
    EULA_FILE="eula.txt"

    confirmation() {
        read -p $'\nDo you accept the Minecraft EULA? (https://aka.ms/MinecraftEULA) (y/N) ' -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]];
        then
            return 0
        else
            return 1
        fi
    }

    if [ ! -f "$EULA_FILE" ];
    then
        touch "$EULA_FILE"
        echo -e \
            "#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA)." \
            "\n#$(date)" \
            "\neula=false" > "$EULA_FILE"
    fi

    if grep -q "eula=false" "$EULA_FILE";
    then
        if confirmation;
        then
            sed -i 's/eula=false/eula=true/g' "$EULA_FILE"
            echo "EULA has been accepted."
            return 0
        else
            echo "EULA has not been accepted. Please accept the EULA to continue."
            return 1
        fi
    fi

    return 0
}

downloadInstaller() {
    printHeader "Downloading Forge installer..."

    if [ ! -f "$FORGE_INSTALLER_JAR" ];
    then
        echo -e "Forge installer ($FORGE_INSTALLER_JAR) does not exist. Proceeding to download Forge installer.\n\n"
        if ! wget "$FORGE_DOWNLOAD_URL";
        then
            echo -e "Failed to download Forge installer."
            return 1
        fi
        echo -e "Forge installer downloaded."
    else
        echo -e "Forge installer already exists."
    fi

    return 0
}

installServer() {
    printHeader "Installing Minecraft server..."

    if [ ! -d "./$FORGE_JAR_PATH" ];
    then
        echo -e "Library path ($FORGE_JAR_PATH) does not exist. Proceeding to install Minecraft server.\n\n"

        if ! java -jar "$FORGE_INSTALLER_JAR" --installServer;
        then
            echo -e "Failed to install Minecraft server."
            return 1
        fi
        echo -e "Minecraft server installed."
    else
        echo -e "Minecraft server is installed."
    fi

    return 0
}

if ! setWorkingDirectory "./Minecraft";
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

NAME="Minecraft@$INSTANCE_NAME"

if checkScreenInstanceExists "$NAME";
then
    exit 1
fi

if ! setWorkingDirectory "$SERVER_WORKING_DIRECTORY";
then
    exit 1
fi

if ! acceptEula;
then
    exit 1
fi

if ! updateJavaVersion;
then
    exit 1
fi

if ! refreshVariables;
then
    exit 1
fi

if ! printVariables;
then
    exit 1
fi

if ! downloadInstaller;
then
    exit 1
fi

if ! installServer;
then
    exit 1
fi

if ! updateUserJvmArgs;
then
    exit 1
fi

if ! cleanUserJvmArgs;
then
    exit 1
fi

if ! printUserJvmArgs;
then
    exit 1
fi

if [ -f "$FORGE_LEGACY_JAR" ];
then
    jvm_args=$(grep -v "^#" user_jvm_args.txt | tr '\n' ' ')
    startScreenInstance "$NAME" "java -jar $FORGE_LEGACY_JAR -Xmx$SERVER_MAX_RAM -Xms$SERVER_MIN_RAM $jvm_args nogui"
else
    startScreenInstance "$NAME" "java @user_jvm_args.txt @$FORGE_UNIX_ARGS_FILE_PATH '$@' -Xmx$SERVER_MAX_RAM -Xms$SERVER_MIN_RAM nogui"
fi


read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
