import "jsr:@std/dotenv/load";
import { ChatOpenAI } from "npm:@langchain/openai";
import { oneLine } from "npm:common-tags"
import { ChatPromptTemplate, PromptTemplate } from "npm:@langchain/core/prompts";
import { StringOutputParser, StructuredOutputParser } from "npm:@langchain/core/output_parsers";

function newChat() {
  const chatModel = new ChatOpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
    model: "deepseek-chat",
    configuration: {
      baseURL: "https://api.deepseek.com/v1",
    }
  });
  return chatModel;
}
// chat-model
async function translate(text: string, sourceLangName: string, targetLangName: string) {
  const chatModel = newChat();
  const outputPraser = new StringOutputParser();
  const systemTemplate = (
    sourceLangName: string,
    targetLangName: string
  ) => oneLine`
        You are a professional translation engine.
        Please translate the text from ${sourceLangName} to ${targetLangName}.
      `;
  const systemPrompt = systemTemplate(sourceLangName, targetLangName)
  
  const humanTemplate = "Please translate the following text:\n\n{text}";
  const chatPrompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", humanTemplate],
  ]);

  const chain = chatPrompt.pipe(chatModel).pipe(outputPraser);

  const res = await chain.invoke({
    text: text,
  });
  return res;
}

function checkTranslateQuality(text: string, source: string, targetLangName: string) {
  // use a check prompt, and structed output, {lang, score}
  const chatModel = newChat();
  const parser = StructuredOutputParser.fromNamesAndDescriptions({
    score: "A score between 0 and 5 meaning the quality of the translation.",
    better_answer: "A better translation of the source text. if the score is greater than 3, the translation is perfect. return empty string. else return the better answer.",
  });
  const checkPrompt = PromptTemplate.fromTemplate(oneLine`
    You are a professional translation engine.
    Please translate the text into ${targetLangName} without explanation.
    Then, please rate the quality of the translation.
    The translation as follows:
    source text: {source}
    translation: {text}
    {instructions}
    `);

  const chain = checkPrompt.pipe(chatModel).pipe(parser);
  return chain.invoke({ 
    text: text, 
    source: source,
    instructions: parser.getFormatInstructions()
   });
}


const sourceLangName = "English";
// the most used 13 languages in the world
const targetLangNames = [
  "Chinese",
  "French",
  "German",
  "Hindi",
  "Italian",
  "Japanese",
  "Korean",
  "Portuguese",
  "Russian",
  "Spanish",
  "Turkish",
]

for (const targertLangName of targetLangNames) {
  const text = "Death like the cold of night, the life is like the day of spring. author of {{author}}, write at {{year}} and {{city}} "

  const res = await translate(text, sourceLangName, targertLangName);
  const checkRes = await checkTranslateQuality(res, text, targertLangName)
  console.log(`target: ${targertLangName}`)
  console.log(`answer: ${res}`)
  console.log(`score: `, checkRes.score)
  console.log(`better answer: ${checkRes.better_answer}`)
  console.log("hh:mm:ss", new Date().getHours(), new Date().getMinutes(),  new Date().getSeconds())
}
