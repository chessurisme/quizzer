# Quiz Manager

A modern quiz management application built with vanilla JavaScript, featuring client-side routing with Navigo for seamless navigation.

## Features

- **Client-side Routing**: Full navigation support with browser history API
- **Quiz Management**: Create, edit, and organize quizzes in folders
- **Multiple Quiz Types**: Multiple choice, emoji, riddle, and word scramble quizzes
- **Play Mode**: Interactive quiz taking with scoring and feedback
- **Search**: Full-text search across all quizzes and questions
- **Data Management**: Import/export functionality with IndexedDB storage
- **Responsive Design**: Modern UI with dark/light theme support

## Navigation

The application uses Navigo for client-side routing with the following routes:

- `/` - Home page
- `/folder/:id` - Folder view
- `/search` - Search results
- `/settings` - Settings page
- `/quiz/:id` - Quiz editor
- `/quiz/:id/play` - Quiz play mode
- `/quiz/:id/results` - Quiz results

## UI

```css
:root {
	--color-brand: #97a8fc;
	--color-text-strong: #fff;
	--color-text-weak: #ced0d9;
	--color-stroke-strong: #9598a6;
	--color-stroke-weak: #363840;
	--color-fill: #1f2026;
	--color-background: #12131a;

	--size-base: 18px;
	--size-s: calc(var(--size-base) / 1.618);
	--size-xs: calc(var(--size-s) / 1.618);
	--size-xxs: calc(var(--size-xs) / 1.618);
	--size-l: calc(var(--size-base) * 1.618);
	--size-xl: calc(var(--size-l) * 1.618);
	--size-xxl: calc(var(--size-xl) * 1.618);

	--cubic-bezier-ease-out-quad: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

- Use Lucide icons for Vanilla JS
- Font: Inter for body text, Lucide Baskerville for headings

## Sitemap

- Home - Sidebar - New Folder - _Created Folder_ - _Created Quiz_ - Settings - Theme - Data Management - Help - About - Search Bar - Search Results - Import Quiz - Edit Quiz - Create Quiz - Play Quiz - Back to Unsave Quiz

### Home

In header, you can see the sidebar and setting button;
In main, you can see the label saying "Welcome to Quiz Manager", search bar and action buttons at the buttons. The action buttons showing are "Import", "Create", and "Play" and the "Back to Unsave" when there is a pending quiz created (more on that later).

#### Modal

When interacting the action buttons, a modal from the bottom will be shown.
Modal of Import shows a file picker with a labels.
Modal of Create shows a folder picker with a labels.
Modal of Play shows a folder and quiz picker with a labels.

### Sidebar

In sidebar, it will shown in the left side. There is a logo (just Quiz Manager) in the uppermost and folder section with a "Folder" label as introductory, here the button "New Folder" is shown. Next to it are the folders created.

### Settings

In settings, there are options to change theme, data management, help, and about.

### Search Bar

When search bar is interact a search results page are shown, there will be of previous and next navigation. The search results will be shown in the main, where the search provide quizzes which can be interact to edit or play.

### Quiz Editor

Depends on the quiz types:

Quiz Editor UI is editing one quiz at one page.

Common for all: - In header there is a back button, label which is the name of the quiz (flex: 1) and a save button and a more button - In more button shows a modal showing the options for the quiz like jump, play, lock, delete - In contents will be described at the bottom - In footer there is a navigation of previous and next button, and between them there is add button (initially the previous button will be disabled, and when in the end the next button will be disabled), use icons here only

#### Multiple Choice

In contents, there is a grid 4 rows, 2 column. Arranged in the order of question, and choices, and references. 1st row is for question, 2nd row and 3rd is for choices in 2x2, and 4th row is for references. Above them is index number which can be tapped to jump. 1st box on choices are bordered green because it is the right answer.

#### Emoji

In contents, there is a grid 4 rows, 1 column. Arranged in the order of question, and answers, and references. 1st row is for question, 2nd row is for emoji, 3rd row is for answers, and 4th row is for references. Above them is index number which can be tapped to jump.

#### Riddle

In contents, there is a grid 3 rows, 1 column. Arranged in the order of question, and answers, and references. 1st row is for question, 2nd row is for answers, and 3rd row is for references. Above them is index number which can be tapped to jump.

#### Word Scramble

In contents, there is a grid 2 rows, 1 column. Arranged in the order of word, and scrambled word. 1st row is for word, 2nd row is for scrambled word. Above them is index number which can be tapped to jump.

#### Play Quiz

The layout are the same but now the border for answer is disabled, answer is randomized, with a scoring system so that it can be checked if the answer is correct or not.
