# Hermes Castano AI Interview Assistant

Static recruiter-facing AI interview assistant for Hermes Castano.

## What it does

- Runs from `index.html` with no server or build step.
- Works on GitHub Pages or by opening the file locally.
- Uses an OpenAI API key from the URL.
- Optionally uses Azure Speech for voice output.
- Keeps conversation context only in the current browser session.

## Run it

```text
index.html?openai_key=YOUR_OPENAI_KEY
```

Optional voice:

```text
index.html?openai_key=YOUR_OPENAI_KEY&azure_key=YOUR_AZURE_SPEECH_KEY&azure_region=eastus
```

Optional model override:

```text
index.html?openai_key=YOUR_OPENAI_KEY&model=gpt-5.4-mini
```

## Files

```text
index.html
css/style.css
js/script.js
images/imgSam.jfif
```

Keep your existing `images/imgSam.jfif` file in place.

## Design direction

This version reduces dashboard noise and puts the chat first. The left side is only identity, positioning, target-role flexibility, and links. The right side is the actual recruiter conversation.
