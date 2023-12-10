#!/bin/bash
source "./start@~.sh"
echo -e "Minecraft Server"

SERVER_WORKING_DIRECTORY=

# The Minecraft Java version, ex. "1.16.5" "1.20.1"
MINECRAFT_VERSION=

# Either "forge" or "fabric"
SERVER_LOADER_TYPE=

# The Forge or Fabric version, ex. "47.1.3" "latest" "recommended"
# https://files.minecraftforge.net/net/minecraftforge/forge/
SERVER_LOADER_VERSION="recommended"

# JVM RAM arguments, ex. "4G" "4096M"
SERVER_MAX_RAM="6G"
SERVER_MIN_RAM="2G"

# https://github.com/brucethemoose/Minecraft-Performance-Flags-Benchmarks
SERVER_JVM_ARGUMENTS_11=(
    "-XX:+UnlockExperimentalVMOptions" \
    "-XX:+UnlockDiagnosticVMOptions" \
    "-XX:+AlwaysActAsServerClassMachine" \
    "-XX:+AlwaysPreTouch" \
    "-XX:+DisableExplicitGC" \
    "-XX:+UseNUMA" \
    "-XX:NmethodSweepActivity=1" \
    "-XX:ReservedCodeCacheSize=400M" \
    "-XX:NonNMethodCodeHeapSize=12M" \
    "-XX:ProfiledCodeHeapSize=194M" \
    "-XX:NonProfiledCodeHeapSize=194M" \
    "-XX:-DontCompileHugeMethods" \
    "-XX:MaxNodeLimit=240000" \
    "-XX:NodeLimitFudgeFactor=8000" \
    "-XX:+UseVectorCmov" \
    "-XX:+PerfDisableSharedMem" \
    "-XX:+UseFastUnorderedTimeStamps" \
    "-XX:+UseCriticalJavaThreadPriority" \
    "-XX:ThreadPriorityPolicy=1" \
    "-XX:AllocatePrefetchStyle=3"
)

SERVER_JVM_ARGUMENTS_8=(
    "-XX:+UnlockExperimentalVMOptions" \
    "-XX:+UnlockDiagnosticVMOptions" \
    "-XX:+AlwaysActAsServerClassMachine" \
    "-XX:+ParallelRefProcEnabled" \
    "-XX:+DisableExplicitGC" \
    "-XX:+AlwaysPreTouch" \
    "-XX:+PerfDisableSharedMem" \
    "-XX:+AggressiveOpts" \
    "-XX:+UseFastAccessorMethods" \
    "-XX:MaxInlineLevel=15" \
    "-XX:MaxVectorSize=32" \
    "-XX:+UseCompressedOops" \
    "-XX:ThreadPriorityPolicy=1" \
    "-XX:+UseNUMA" \
    "-XX:+UseDynamicNumberOfGCThreads" \
    "-XX:NmethodSweepActivity=1" \
    "-XX:ReservedCodeCacheSize=350M" \
    "-XX:-DontCompileHugeMethods" \
    "-XX:MaxNodeLimit=240000" \
    "-XX:NodeLimitFudgeFactor=8000" \
    "-XX:+UseFPUForSpilling" \
    "-Dgraal.CompilerConfiguration=community"
)

SERVER_JVM_ARGUMENTS=("${SERVER_JVM_ARGUMENTS_11[@]}")

SERVER_PROPERTIES_FILE="server.properties"

# Based on 1.20
SERVER_PROPERTIES=(
    "allow-flight=true" \
    "allow-nether=true" \
    "broadcast-console-to-ops=true" \
    "broadcast-rcon-to-ops=true" \
    "difficulty=easy" \
    "enable-command-block=true" \
    "enable-jmx-monitoring=false" \
    "enable-query=true" \
    "enable-rcon=true" \
    "enable-status=true" \
    "enforce-secure-profile=true" \
    "enforce-whitelist=false" \
    "entity-broadcast-range-percentage=100" \
    "force-gamemode=false" \
    "function-permission-level=2" \
    "gamemode=survival" \
    "generate-structures=true" \
    "generator-settings={}" \
    "hardcore=false" \
    "hide-online-players=false" \
    "initial-disabled-packs=" \
    "initial-enabled-packs=vanilla" \
    "level-name=world" \
    "level-seed=" \
    "level-type=minecraft\:normal" \
    "log-ips=true" \
    "max-chained-neighbor-updates=1000000" \
    "max-players=20" \
    "max-tick-time=60000" \
    "max-world-size=29999984" \
    "motd=\u00a74X\u00a7e\u00a7ko\u00a74X\u00a7e e\u00a74Sp\u00a74\u00a7ko\u00a74rts\u00a7b\u00a7o Official Minecraft Server" \
    "network-compression-threshold=256" \
    "online-mode=true" \
    "op-permission-level=4" \
    "player-idle-timeout=0" \
    "prevent-proxy-connections=false" \
    "pvp=true" \
    "query.port=25565" \
    "rate-limit=0" \
    "rcon.password=" \
    "rcon.port=25575" \
    "require-resource-pack=false" \
    "resource-pack-prompt=" \
    "resource-pack-sha1=" \
    "resource-pack=" \
    "server-ip=" \
    "server-port=25565" \
    "simulation-distance=10" \
    "spawn-animals=true" \
    "spawn-monsters=true" \
    "spawn-npcs=true" \
    "spawn-protection=16" \
    "sync-chunk-writes=true" \
    "text-filtering-config=" \
    "use-native-transport=true" \
    "view-distance=10" \
    "white-list=false"
)

SERVER_PROPERTIES_LEGACY=(
    "difficulty=1"
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
                echo -e "No recommended Forge version found. Proceeding to use latest version."
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

setSuggestedJvmArgs() {
    ACTUAL_JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1-2)

    if [[ $ACTUAL_JAVA_VERSION == *"Unrecognized option"* ]];
    then
        ACTUAL_JAVA_VERSION=$(java --version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f2)
    fi

    if [ "$(printf '%s\n' "$ACTUAL_JAVA_VERSION" "11" | sort -V | head -n1)" = "$ACTUAL_JAVA_VERSION" ];
    then
        SERVER_JVM_ARGUMENTS=("${SERVER_JVM_ARGUMENTS_8[@]}")
        echo -e "Suggested JVM arguments for Java 8"
    else
        SERVER_JVM_ARGUMENTS=("${SERVER_JVM_ARGUMENTS_11[@]}")
        echo -e "Suggested JVM arguments for Java 11 and above"
    fi
}

updateUserJvmArgs() {
    printHeader "Updating User JVM Arguments"

    # Create the file if it does not exist
    if [ ! -f "$FORGE_USER_JVM_ARGS_FILE" ];
    then
        touch "$FORGE_USER_JVM_ARGS_FILE"
    fi

    # Replace spaces with newlines and replace the file with the processed file
    temp_file=$(mktemp)

    while IFS= read -r line;
    do
        # Add comment and empty line to the processed file
        if [[ "$line" =~ ^#.*$ || -z "$line" ]];
        then
            echo "$line" >> "$temp_file"
            continue
        fi

        # Split the line into an array by spaces
        IFS=' ' read -ra args <<< "$line"

        # Process each argument
        for arg in "${args[@]}";
        do
            echo "$arg" >> "$temp_file"
        done
    done < "$FORGE_USER_JVM_ARGS_FILE"

    # Check if the last character of the file is a newline
    if [[ $(tail -c1 "$temp_file") != "" ]];
    then
        # If not, add a newline
        echo "" >> "$temp_file"
    fi

    # Replace the original file with the processed file
    mv "$FORGE_USER_JVM_ARGS_FILE" "$FORGE_USER_JVM_ARGS_FILE.bak"
    mv "$temp_file" "$FORGE_USER_JVM_ARGS_FILE"

    # Add the JVM arguments if they do not exist
    for arg in "${SERVER_JVM_ARGUMENTS[@]}";
    do
        found=0
        # Strip the value of the argument if it has one
        argname=$(echo "$arg" | sed 's/\([0-9].*\)//')

        while IFS= read -r line;
        do
            # Convert comment to non-comment
            line=$(echo "$line" | sed 's/^#//')
            line=$(trim "$line")

            if [[ "$line" == "$argname"* ]];
            then
                found=1

                if [[ "$line" != "$arg" ]];
                then
                    echo -e "The JVM argument \"$argname\" has a different value. Ignoring \"$arg\"."
                fi
                break
            fi
        done < "$FORGE_USER_JVM_ARGS_FILE"

        if [[ $found -eq 0 ]];
        then
            echo -e "Adding JVM argument: $arg"
            echo -e "$arg" >> "$FORGE_USER_JVM_ARGS_FILE"
        fi
    done

    echo -e "User JVM arguments is good to go."
}

cleanUserJvmArgs() {
    printHeader "Cleaning User JVM Arguments"

    while true;
    do
        output=$(java $(readUserJvmArgs) 2>&1)

        # Check if there are any unrecognized options
        for pattern in "Unrecognized VM option" "Unrecognized option";
        do
            unrecognized_option=$(echo "$output" | grep "$pattern" | awk -F': ' '{print $2}')

            if [ -n "$unrecognized_option" ];
            then
                # Comment out the unrecognized option in user_jvm_args.txt
                sed -i "/$unrecognized_option/s/^/#/" $FORGE_USER_JVM_ARGS_FILE
                echo -e "Cleaning unrecognized option: $unrecognized_option"
                break
            fi
        done

        if [ -z "$unrecognized_option" ];
        then
            # If there is other errors
            if [[ ! "$output" =~ ^Usage.*$ ]];
            then
                echo -e "\n$output\n"
                echo -e "Something is not caught. Please fix the JVM arguments manually."
                return 1
            fi

            break
        fi
    done

    echo -e "User JVM arguments is good to go."
}

readUserJvmArgs() {
    echo $(grep -v "^#" $FORGE_USER_JVM_ARGS_FILE | tr '\n' ' ')
}

printUserJvmArgs() {
    printHeader "User JVM Arguments"
    echo -e "$(readUserJvmArgs | sed 's/ /\n/g')"
}

updateServerProperties() {
    printHeader "Updating Server Properties"

    # If the Minecraft version is older than 1.13, then use the legacy server properties
    if [ "$(printf '%s\n' "$MINECRAFT_VERSION" "1.13" | sort -V | head -n1)" = "$MINECRAFT_VERSION" ];
    then
        # Replace the SERVER_PROPERTIES with the SERVER_PROPERTIES_LEGACY
        for legacyprop in "${SERVER_PROPERTIES_LEGACY[@]}";
        do
            legacypropprefix=$(echo "$legacyprop" | cut -d'=' -f1)

            for prop in "${SERVER_PROPERTIES[@]}";
            do
                if [[ "$prop" == "$legacypropprefix"* ]];
                then
                    SERVER_PROPERTIES=("${SERVER_PROPERTIES[@]/$prop/$legacyprop}")
                fi
            done
        done
    fi

    # Create the file if it does not exist and load it with default values
    if [ ! -f "$SERVER_PROPERTIES_FILE" ];
    then
        touch "$SERVER_PROPERTIES_FILE"

        for arg in "${SERVER_PROPERTIES[@]}";
        do
            echo -e "$arg" >> "$SERVER_PROPERTIES_FILE"
        done

        # Ask the user if they want to update the server properties manually
        read -p $'Do you want to update the server properties manually? (y/N) ' -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]];
        then
            nano "$SERVER_PROPERTIES_FILE"
        fi

        echo -e "Server properties created and loaded with default values."
    fi

    echo -e "Server properties is good to go."
}

acceptEula() {
    printHeader "Signing EULA"

    EULA_FILE="eula.txt"

    confirmation() {
        read -p $'Do you accept the Minecraft EULA? (https://aka.ms/MinecraftEULA) (y/N) ' -n 1 -r
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

    echo "EULA has been accepted."
    return 0
}

downloadInstaller() {
    printHeader "Downloading Forge installer"

    if [ -f "$FORGE_INSTALLER_JAR" ];
    then
        echo -e "Forge installer is good to go."
        return 0
    fi

    echo -e "Forge installer ($FORGE_INSTALLER_JAR) does not exist."

    if [ -d "./$FORGE_JAR_PATH" ];
    then
        echo -e "The library path ($FORGE_JAR_PATH) exists, skipping download."
        return 0
    fi

    echo -e "Downloading Forge installer from $FORGE_DOWNLOAD_URL"
    output=$(wget "$FORGE_DOWNLOAD_URL" 2>&1)

    if [ $? -ne 0 ];
    then
        echo -e "\n$output\n"
        echo -e "Failed to access the Forge website."
        return 1
    fi

    echo -e "Forge installer downloaded."
}

installServer() {
    printHeader "Installing Minecraft server"

    if [ -d "./$FORGE_JAR_PATH" ];
    then
        echo -e "Minecraft server is good to go."
        return 0
    fi

    echo -e "Library path ($FORGE_JAR_PATH) does not exist."
    echo -e "Installing Minecraft server from $FORGE_INSTALLER_JAR"

    output=$(java -jar "$FORGE_INSTALLER_JAR" --installServer 2>&1)

    if [ $? -ne 0 ];
    then
        echo -e "\n$output\n"
        echo -e "Failed to install Minecraft server."
        return 1
    fi

    echo -e "Minecraft server installed."
}

checkAvailableRam() {
    printHeader "Checking available RAM"

    AVAILABLE_RAM=$(free -m | awk '/^Mem:/{print $2}')
    SERVER_MAX_RAM_MB=$(echo $SERVER_MAX_RAM | sed -e 's/G/*1024/' -e 's/M//' | bc)
    SERVER_MIN_RAM_MB=$(echo $SERVER_MIN_RAM | sed -e 's/G/*1024/' -e 's/M//' | bc)

    echo -e "Available RAM: $COLOR_A $AVAILABLE_RAM MB $COLOR_RESET"
    echo -e "Maximum Allocatable RAM: $COLOR_A $SERVER_MAX_RAM_MB MB $COLOR_RESET"
    echo -e "Minimum RAM Required: $COLOR_A $SERVER_MIN_RAM_MB MB $COLOR_RESET"

    if [ "$AVAILABLE_RAM" -lt "$SERVER_MIN_RAM_MB" ];
    then
        echo -e "\n\nNot enough available RAM to allocate minimum RAM."
        return 1
    fi

    if [ "$AVAILABLE_RAM" -lt "$SERVER_MAX_RAM_MB" ];
    then
        echo -e "\n\nMay not have enough available RAM to allocate maximum RAM depending on the JVM RAM usage."
        return 1
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

if [ -z "$SERVER_JVM_ARGUMENTS" ];
then
    if ! setSuggestedJvmArgs;
    then
        exit 1
    fi
fi

if ! printVariables;
then
    exit 1
fi

for arg in "$@";
do
    if [ "$arg" = "--force-reinstall" ];
    then
        printHeader "Forcing reinstall of Minecraft server"
        echo -e "Removing \"$FORGE_JAR_PATH\" and \"$FORGE_INSTALLER_JAR\""
        rm -rf "$FORGE_JAR_PATH"
        rm -f "$FORGE_INSTALLER_JAR"

        echo -e "Backing up \"$FORGE_USER_JVM_ARGS_FILE\""
        mv "$FORGE_USER_JVM_ARGS_FILE" "$FORGE_USER_JVM_ARGS_FILE.old" 2>/dev/null
        break
    fi
done

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

if ! updateServerProperties;
then
    exit 1
fi

if ! checkAvailableRam;
then
    exit 1
fi

if [ -f "$FORGE_LEGACY_JAR" ];
then
    startScreenInstance "$NAME" "java -server -Xmx$SERVER_MAX_RAM -Xms$SERVER_MIN_RAM $(readUserJvmArgs) -jar $FORGE_LEGACY_JAR nogui"
else
    startScreenInstance "$NAME" "java -server -Xmx$SERVER_MAX_RAM -Xms$SERVER_MIN_RAM @$FORGE_USER_JVM_ARGS_FILE @$FORGE_UNIX_ARGS_FILE_PATH nogui"
fi

read -p $'\n\nPress Enter to attach to the instance, or Ctrl+C to skip.'
screen -r "$NAME"
exit 0
