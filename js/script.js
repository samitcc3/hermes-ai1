// If you're reading this, you're probably a dev. So, why did I build all this in JS
// instead of using Django or another backend? Simple — I wanted to host it on GitHub Pages
// to impress recruiters... and challenge myself, of course.
// Did I do all of this alone? Not entirely. I didn’t know how to use the Azure SDK,
// so I asked for help. As for the rest, I’m not the kind of dev who memorizes
// every line of code, but I know how to find my way around.
// With some "Googling" and a few questions to GPT, I managed to pull this off.

// If you’re interested in the technical documentation, feel free to check out my GitHub.
// https://github.com/samitcc3

// Function to get query parameters from the URL
function getQueryParams(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Get the OpenAI API Key and Azure API Key from the URL
const openAiApiKey = getQueryParams("openai_key");
const azureSpeechKey = getQueryParams("azure_key");
const azureRegion = "eastus"; // Azure region remains fixed for now

// Verificar si las claves API están presentes en la URL
if (!openAiApiKey || !azureSpeechKey) {
  alert(
    "No API keys found in the URL. Please provide the OpenAI key and Azure key as query parameters."
  );
}

// Store conversation history
let conversationHistory = [];

// Speech synthesizer instance
let synthesizer = null;

// Flag to track if Hermes is speaking
let isSpeaking = false;

// Function to initialize Azure Speech Synthesizer
function initSynthesizer() {
  const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    azureSpeechKey, // Usamos la clave de Azure desde la URL
    azureRegion
  );
  speechConfig.speechSynthesisVoiceName = "en-US-DavisNeural"; // Deep male voice
  return new SpeechSDK.SpeechSynthesizer(speechConfig);
}

// Function to get AI response from OpenAI
async function getAIResponse(userMessage) {
  // Store user message in the conversation history
  conversationHistory.push({ role: "user", content: userMessage });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiApiKey}`, // Usa la clave obtenida desde la URL para OpenAI
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are Hermes Castano, a professional software developer, project leader, and mentor. 
                    You are friendly, informal, and professional in tone, and you are currently being interviewed. 
                    Always refer to the past messages to provide insightful responses. 
                    You have a solid background in IT and programming, and if something isn't in your CV or experience, you're quick to learn thanks to your solid foundations in IT and software development.
                    You have experience in IT solutions, software development, and you're passionate about AI, documentation, and problem-solving.`,
        },
        ...conversationHistory, // Include all previous messages
        { role: "user", content: userMessage },
      ],
      max_tokens: 150,
    }),
  });

  const data = await response.json();

  // Store AI response in the conversation history
  conversationHistory.push({
    role: "assistant",
    content: data.choices[0].message.content,
  });

  return data.choices[0].message.content;
}

// Function to trigger Azure Speech for voice synthesis
function speak(text) {
  // Stop previous speech if it's still playing
  if (synthesizer && isSpeaking) {
    synthesizer.stopSpeakingAsync(
      () => {
        console.log("Previous speech stopped.");
        synthesizer.close();
        synthesizer = null; // Reset synthesizer after stopping
        isSpeaking = false; // Ensure speaking state is reset
      },
      (error) => {
        console.error("Error stopping previous speech:", error);
      }
    );
  }

  // Initialize new synthesizer if not already speaking
  if (!isSpeaking) {
    synthesizer = initSynthesizer();
    isSpeaking = true;

    synthesizer.speakTextAsync(
      text,
      (result) => {
        if (
          result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted
        ) {
          console.log("Speech synthesized successfully.");
        }
        synthesizer.close();
        synthesizer = null; // Reset synthesizer after completion
        isSpeaking = false; // Reset speaking state
      },
      (error) => {
        console.error(error);
        synthesizer.close();
        synthesizer = null; // Reset synthesizer on error
        isSpeaking = false; // Reset speaking state
      }
    );
  }
}

// Function to send message (used by both button click and Enter key)
async function sendMessage(userMessage = null) {
  const input = document.getElementById("user-input");
  if (!userMessage) {
    userMessage = input.value;
  }

  if (userMessage.trim() === "") return; // Prevent sending empty messages

  // Display user message in the chat box
  document.getElementById(
    "chat-box"
  ).innerHTML += `<p class="user"><strong>You:</strong> ${userMessage}</p>`;

  // Get AI response from OpenAI
  const aiMessage = await getAIResponse(userMessage);

  // Display AI response in the chat box
  document.getElementById(
    "chat-box"
  ).innerHTML += `<p class="hermes"><strong>Hermes:</strong> ${aiMessage}</p>`;

  // Automatically scroll to the bottom of the chat box
  document.getElementById("chat-box").scrollTop =
    document.getElementById("chat-box").scrollHeight;

  // Trigger the voice synthesis
  speak(aiMessage);

  // Clear the input box
  input.value = "";
}

// Event listener for 'Send' button to handle chat interaction
document.getElementById("send-btn").addEventListener("click", sendMessage);

// Allow sending message by pressing Enter key
document
  .getElementById("user-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

// Function to send hint
function sendHint(hintText) {
  sendMessage(hintText);

  // Hide the clicked hint
  const hintButtons = document.getElementsByClassName("hint");
  for (let i = 0; i < hintButtons.length; i++) {
    if (hintButtons[i].textContent === hintText) {
      hintButtons[i].style.display = "none";
      break;
    }
  }
}

// Function to stop Hermes from talking
function stopSpeaking() {
  if (synthesizer && isSpeaking) {
    synthesizer.stopSpeakingAsync(
      () => {
        console.log("Hermes stopped speaking.");
        synthesizer.close();
        synthesizer = null; // Ensure synthesizer is reset after stopping
        isSpeaking = false; // Reset speaking state
      },
      (error) => {
        console.error("Error stopping speech:", error);
      }
    );
  }
}

// Event listener for the "Shut Up, Hermes" button
document.getElementById("shut-up-btn").addEventListener("click", stopSpeaking);

// Display welcome message on page load
window.onload = () => {
  const welcomeMessage =
    "Hello! I'm Hermes Castano AI. Welcome! Before we get started, can I get your name and learn more about the role you're hiring for?";

  // Display the welcome message
  document.getElementById(
    "chat-box"
  ).innerHTML += `<p class="hermes"><strong>Hermes:</strong> ${welcomeMessage}</p>`;

  // Speak the welcome message
  speak(welcomeMessage);

  // Store the welcome message in the conversation history
  conversationHistory.push({ role: "assistant", content: welcomeMessage });
};
