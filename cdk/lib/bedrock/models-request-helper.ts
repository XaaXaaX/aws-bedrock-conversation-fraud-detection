export class BedrockModelRequestHelper {

  static RequestForModel(modelArn: string, prompt: string) {
    if(modelArn.includes('mistral')) return this.requestForMistral(prompt);
    if(modelArn.includes('titan')) return this.requestForTitan(prompt);
    throw new Error('Model not supported');
  }
  private static requestForMistral(prompt: string) {
    return {
      prompt: prompt,
    }
  }

  private static requestForTitan(prompt: string) {
    return {
      inputText: prompt,
    }
  }
}