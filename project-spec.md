# Side-Hustle Generator App

## Project Overview
A web application that generates personalized side-hustle ideas using OpenAI's ChatGPT API, with user authentication and generation history tracking.

## Authentication Requirements
### Supabase Integration
- Implement user authentication
- Secure user registration and login
- Manage user sessions
- Store user-specific generation history

## User Interface Components
### Input Fields with Concatenation
1. Skills Input
   - Label: "Your Skills"
   - Placeholder: "teaching, learning, workshops"
   - Concatenation Prefix: "My Skills: "
   - Example: Input "coding" → Concatenated String: "My Skills: coding"

2. Background Input
   - Label: "Your Background"
   - Placeholder: "marketer, have ADHD, love playing D&D"
   - Concatenation Prefix: "My Background: "
   - Example: Input "marketing professional" → Concatenated String: "My Background: marketing professional"

3. Ideal Customer Input
   - Label: "Your Ideal Customer"
   - Placeholder: "full time professionals looking to build their first side business"
   - Concatenation Prefix: "My Ideal Customer: "
   - Example: Input "tech entrepreneurs" → Concatenated String: "My Ideal Customer: tech entrepreneurs"

4. Secondary Goal Input
   - Label: "Your Secondary Goal"
   - Placeholder: "build leveraged income streams"
   - Concatenation Prefix: "My Secondary Goal: "
   - Example: Input "passive income" → Concatenated String: "My Secondary Goal: passive income"

### Generate Button
- Text: "Generate your side-hustle"
- Action: 
  1. Concatenate inputs with prefixes
  2. Send to OpenAI API
  3. Save generation to user's history

## Generation History Feature
### Database Schema
```typescript
interface SideHustleGeneration {
  id: string;
  userId: string;
  generatedIdea: string;
  inputs: {
    skills: string;
    background: string;
    idealCustomer: string;
    secondaryGoal: string;
  };
  createdAt: Date;
}