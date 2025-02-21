import "./style.css";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

// using these models since anthropic requires us to fork over some info and the results are basically the same
const llama3Id = "meta.llama3-1-8b-instruct-v1:0";
const mistralId = "mistral.mistral-7b-instruct-v0:2";

let selectedChips = [];

// generated prompt when function is called with current chips
function getLLMInput() {
  const prompt =
    "Give me an affirmation to boost my motivation today" +
      selectedChips.length ===
    0
      ? "."
      : ", referencing " +
        selectedChips.join(" and ") +
        " by adding emoji." +
        " Don't show the prompt, only the quote. Do not add anything like Here is an affirmation... just return the affirmation alone";
  return [
    {
      role: "user",
      content: [{ text: prompt }],
    },
  ];
}

// generated prompt when function is called with current chips
function getImageGenInput() {
  const imagePrompt =
    "Give me motivatonal image" + selectedChips.length === 0
      ? ""
      : "featuring " + selectedChips.join(" and ");
  return {
    contentType: "application/json",
    accept: "*/*",
    modelId: "stability.stable-diffusion-xl-v1",
    body: JSON.stringify({
      text_prompts: [
        {
          text: imagePrompt,
        },
      ],
      cfg_scale: 5,
      seed: Math.floor(Math.random() * 1025),
      steps: 50,
    }),
  };
}

// toggles styling and adds/removes elements from selectedChips
function toggleChips(id) {
  const chip = document.querySelector("#" + id);
  if (selectedChips.indexOf(id) == -1) {
    chip.classList.remove("deselected");
    selectedChips.push(id);
    console.log(selectedChips);
    return;
  }

  chip.classList.add("deselected");
  selectedChips = selectedChips.filter((item) => item != id);
  console.log(selectedChips);
}

async function fetchNewAffirmation(modelId) {
  disableButton(true);
  showLoadingAnimation();

  try {
    const response = await client.send(
      new ConverseCommand({ modelId, messages: getLLMInput() }),
    );
    const affirmation = response.output.message.content[0].text;
    // set the affirmation in HTML
    document.querySelector("#affirmation").innerHTML = affirmation;
  } catch (err) {
    console.error(err);
    document.querySelector("#affirmation").innerHTML = err;
    disableButton(false);
    throw err; // propogate error up, I know this is kinda stupid but I'm also way too lazy to do this properly
  }
  disableButton(false);
}

const textDecoder = new TextDecoder("utf-8");

// generate image using SDXL
async function generateImage() {
  disableButton(true);
  showImageLoadingAnimation();

  try {
    const response = await client.send(
      new InvokeModelCommand(getImageGenInput()),
    );
    const jsonString = textDecoder.decode(response.body.buffer);
    const parsedData = JSON.parse(jsonString);
    document.querySelector("#imageContainer").innerHTML =
      `<img src=\"data:image/png;base64, ${parsedData.artifacts[0].base64}\">`; // this part will be different for Titan image gen
  } catch (err) {
    document.querySelector("#affirmation").innerHTML = err; // show error in affirmation
    document.querySelector("#imageContainer").innerHTML = ""; // clear image
    disableButton(false);
  }

  disableButton(false);
}

// generate affirmation with Llama w/ mistral fallback
async function generateLlama() {
  try {
    await fetchNewAffirmation(llama3Id);
  } catch (err) {
    document.querySelector("#affirmation").innerHTML +=
      "\nRetrying with other model";
    await new Promise((r) => setTimeout(r, 1000)); // so user has time to read error before falling back to other model
    await fetchNewAffirmation(mistralId); // fallback model
  }
}

// generate affirmation with mistral w/ Llama fallback
async function generateMistral() {
  try {
    await fetchNewAffirmation(mistralId);
  } catch (err) {
    document.querySelector("#affirmation").innerHTML +=
      "\nRetrying with other model";
    await new Promise((r) => setTimeout(r, 1000)); // so user has time to read error before falling back to other model
    await fetchNewAffirmation(llama3Id); // fallback model
  }
}

// Shows a loading animation while fetching a new affirmation
function showLoadingAnimation() {
  document.querySelector("#affirmation").innerHTML =
    '<div class="loading-spinner"></div>';
}

// Shows a loading animation while generateing a new image
function showImageLoadingAnimation() {
  document.querySelector("#imageContainer").innerHTML =
    '<div class="loading-spinner"></div>';
}

// Disables the button while fetching a new affirmation so we don't request several at once by clicking repeatedly
function disableButton(isDisabled) {
  const llamaButton = document.querySelector("#getNewAffirmationLlama");
  const mistralButton = document.querySelector("#getNewAffirmationMistral");
  const imageButton = document.querySelector("#generateImage");
  llamaButton.disabled = isDisabled;
  mistralButton.disabled = isDisabled;
  imageButton.disabled = isDisabled;
}

init();

// Called on page load (or refresh), fetches a new affirmation
async function init() {
  try {
    // get the user's credentials from environment variables
    const creds = await fetchCredentials();
    // instantiate the BedrockRuntimeClient
    client = createBedrockClient(creds);
    // Once everything is setup, let's get the first affirmation
    await generateLlama();
  } catch (err) {
    console.error(err);
    document.querySelector("#affirmation").innerHTML = err;
  }

  // binding buttons to functions
  const llamaButton = document.querySelector("#getNewAffirmationLlama");
  llamaButton.addEventListener("click", generateLlama);
  const mistralButton = document.querySelector("#getNewAffirmationMistral");
  mistralButton.addEventListener("click", generateMistral);
  const imageButton = document.querySelector("#generateImage");
  imageButton.addEventListener("click", generateImage);

  // binding chips to functions
  const flowersChip = document.querySelector("#flowers");
  flowersChip.addEventListener("click", () => toggleChips("flowers"));
  const plantsChip = document.querySelector("#plants");
  plantsChip.addEventListener("click", () => toggleChips("plants"));
  const animalsChip = document.querySelector("#animals");
  animalsChip.addEventListener("click", () => toggleChips("animals"));
}

let client = null;
// Initialize new Bedrock client
function createBedrockClient(creds) {
  client = new BedrockRuntimeClient({
    credentials: creds.credentials,
    region: creds.region,
  });
  return client;
}

// get creds from .env file
async function fetchCredentials() {
  return {
    region: "us-west-2", // Hardcoded as this region is a requirement for the hosted Workshops and must not be changed.
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
  };
}
