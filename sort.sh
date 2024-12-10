#!/bin/bash

jq --sort-keys '.' modrinth.index.json > tmp.json && mv tmp.json modrinth.index.json

jq '.files |= sort_by(.downloads)' modrinth.index.json > tmp.json && mv tmp.json modrinth.index.json
