#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os
import shutil

from enum import Enum
from typing import List

USER_HOME = os.path.expanduser('~')

class Module(Enum):
    pass

class ModuleElement:
    class Type(Enum):
        UNKNOWN = 0
        FILE = 1
        DIRECTORY = 2

    class CreationMethod(Enum):
        MKDIR = 0
        COPY = 1
        SYMLINK = 2

        def __lt__(self, other) -> bool:
            """The smaller the value, the higher the priority.
            """
            return self.value < other.value

    def __init__(
        self,
        *,
        parent: Module,
        creationType: CreationMethod,
        path: str,
        exist_ok: bool=True
    ):
        self._parent: Module = parent
        self._creationType: CreationMethod = creationType
        self._raw_path: str = path
        self._path = os.path.normpath(os.path.join(parent.getAbsolutePath(), path))
        self._exist_ok = exist_ok

        if not os.path.exists(self._path):
            raise Exception(f"Path {self._path} does not exist.")

        self.elementType = self.Type.FILE \
            if os.path.isfile(self._path) \
            else self.Type.DIRECTORY \
            if os.path.isdir(self._path) \
            else self.Type.UNKNOWN

    def setup(self, destPath: str) -> None:
        dest = os.path.join(
            os.path.abspath(destPath),
            self._raw_path
        )

        match self._creationType:
            case self.CreationMethod.COPY:
                self._copy(dest)

            case self.CreationMethod.MKDIR:
                if self.elementType == self.Type.FILE:
                    raise Exception(f"Cannot create directory from a FILE element, {self._path}")

                self._mkdir(dest)

            case self.CreationMethod.SYMLINK:
                self._softLink(dest)

            case _:
                raise Exception(f"Unknown creation type {self._creationType}")

        # Make sure that the file is executable
        if self.elementType == self.Type.FILE and os.path.basename(self._raw_path).endswith(".sh"):
            os.chmod(dest, 0o755)

    def _mkdir(self, destPath: str) -> None:
        dest = os.path.abspath(destPath)
        os.makedirs(dest, exist_ok=self._exist_ok)
        print(f"Make directory {dest}")

    def _copy(self, destPath: str) -> None:
        dest = os.path.abspath(destPath)

        if os.path.exists(dest):
            if self.elementType == self.Type.FILE:
                os.remove(dest)

            if self.elementType == self.Type.DIRECTORY:
                print(f"Directory {dest} already exists, skipping copy.")
                return

        shutil.copy(self._path, dest)
        print(f"Copy {self._path} -> {dest}")

    def _softLink(self, destPath: str) -> None:
        dest = os.path.abspath(destPath)

        if os.path.exists(dest):
            if self.elementType == self.Type.FILE:
                os.remove(dest)

            if self.elementType == self.Type.DIRECTORY:
                print(f"Directory {dest} already exists, skipping symlink creation.")
                return

        os.symlink(self._path, dest)
        print(f"Symlink {self._path} -> {dest}")

    def getAbsolutePath(self) -> str:
        return self._path

    def getRelativePath(self) -> str:
        return os.path.relpath(self._path)

    def getType(self) -> Type:
        return self.elementType

    def getElementCreationMethod(self) -> CreationMethod:
        return self._creationType

    def getElementParent(self) -> Module:
        return self._parent

class Module(Enum):
    GAMES = "Games"

    def getAbsolutePath(self):
        return os.path.abspath(self.value)

    def getRelativePath(self):
        return self.value

    def getIncludes(self) -> List[ModuleElement]:
        INCLUDE_FILENAME = "include.json"
        file_path = os.path.join(self.getAbsolutePath(), INCLUDE_FILENAME)

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        elements: List[ModuleElement] = [
            ModuleElement(
                parent=self,
                creationType=ModuleElement.CreationMethod[key.upper()],
                path=value,
            )
            for key, values in data.items()
            for value in values
        ]

        elements.sort(key=lambda x: x.getElementCreationMethod())
        return elements

    def setup(self, path: str) -> None:
        includes: List[ModuleElement] = self.getIncludes()

        for include in includes:
            include.setup(path)

def main():
    for module in Module:
        module.setup(USER_HOME)
        print(f"{module.name} -> {module.getRelativePath()}")
