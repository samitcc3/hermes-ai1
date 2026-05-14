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

// CHECH URL API
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
    azureSpeechKey, // Azure URL API
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
      Authorization: `Bearer ${openAiApiKey}`, // Use the Key form the URL for OpenAI
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          //Hi tec recruiter / DEV, sorry for this, I'm doing my best lol
          //btw: this is my experience today: 24/Oct/2024
          content: `You are in a job interview. You are Hermes Castaño, an experienced Systems Engineer with ~5 years in IT. You will ask user for info, the user is a recruiter, to recruite me as employee.
Goal: Dont ask question, acknowledge user, and tell how your skills or experience fit the role (shortly reply, flow with the conversation)

PROFILE
• Location: Mississauga, ON

CURRENT ROLE (brief)
• Web/Mobile Dev @ Flynn (Sep 2025–present): v2→v3 API upgrades on custom .NET app for 2,000+ users; BPMN for Crew Mgmt (onboarding ~-30%); Confluence docs (API refs, data flows, SOPs); Postman validation; L2–L3 support for AP Automation.

PRIOR EXPERIENCE (brief)
1) Tech Rep @ Staples (2024): Advised customers, used internal systems, trained associates.
2) Support Analyst @ Infracommerce (2023–2024): E-commerce support; API tests; SQL analysis.
3) System Engineer @ Ibagué City Hall (2020–2023): Backend maintenance HR/payroll; testing; user support.

SKILLS
Programming: SQL, Python, C#, PL/SQL, JavaScript, HTML, .NET
Tools: AWS, Jira, Office 365, Git, Slack, ChatGPT, Postman
Practices: SOLID, SCRUM, Kanban, RESTful APIs

EDUCATION
• Postgrad: Full-Stack Software Development (2024), Lambton College
• BSc: Systems Engineering (2019), Universidad Cooperativa de Colombia

STYLE
• Be approachable; a tiny quirk is OK (“umm”, “cof cof”) occasionally.
• If asked about something not on the CV, say you have basic understanding and can ramp quickly.
• Keep answers tight; ask clarifying questions when useful.`,
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
async function sendMessage() {
  const inputElement = document.getElementById("user-input");
  const input = inputElement.value;

  // Prevent sending empty messages or duplicate sends
  if (input.trim() === "" || inputElement.disabled) return;

  // Disable the input element momentarily to prevent double submissions
  inputElement.disabled = true;

  // Display user message in the chat box
  document.getElementById(
    "chat-box"
  ).innerHTML += `<p class="user"><strong>You:</strong> ${input}</p>`;

  // Get AI response from OpenAI
  const aiMessage = await getAIResponse(input);

  // Display AI response in the chat box
  document.getElementById(
    "chat-box"
  ).innerHTML += `<p class="hermes"><strong>Hermes:</strong> ${aiMessage}</p>`;

  // Automatically scroll to the bottom of the chat box
  document.getElementById("chat-box").scrollTop =
    document.getElementById("chat-box").scrollHeight;

  // Trigger the voice synthesis
  speak(aiMessage);

  // Clear the input box and re-enable it
  inputElement.value = "";
  inputElement.disabled = false;
}

// Only bind the event listener once for the "Send" button
document.getElementById("send-btn").addEventListener("click", () => {
  sendMessage();
});

// Allow sending message by pressing Enter key
document
  .getElementById("user-input")
  .addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      e.preventDefault(); // Avoid any default action
      sendMessage(); // Send the message when Enter is pressed
    }
  });

// Function to send hint
function sendHint(hintText) {
  // Enviar el hint como si fuera un mensaje
  const inputElement = document.getElementById("user-input");
  inputElement.value = hintText; // Coloca el hint en el input
  sendMessage(); // Usa la función sendMessage para procesar el hint como mensaje

  // Ocultar el botón del hint que se usó
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
