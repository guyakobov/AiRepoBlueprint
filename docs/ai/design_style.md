# Design Style

Design style instructions for websites, apps, and UI clients.

## Goal

The UI should look consistent, clear, and professional.

## Source of truth

- Keep product-specific design choices in this file.
- Follow existing design patterns before adding new ones.
- Do not create a new visual style unless the project asks for it.
- When a design system exists, use it.

## Visual direction

- Define the main audience and use case.
- Choose a style that matches the product type.
- SaaS, dashboards, CRM, admin tools, and internal tools should be quiet and practical.
- Marketing pages can be more visual, but must still show the real product or offer clearly.
- Games and creative tools can be more expressive.

## Layout

- Build the real user workflow as the first screen when this is an app or tool.
- Do not make a landing page unless the project needs one.
- Keep layouts easy to scan.
- Avoid nested cards.
- Use cards only for repeated items, modals, and framed tools.
- Keep spacing consistent.
- Make dense tools organized, not decorative.

## Components

- Use the project component library when one exists.
- Use familiar controls:
  - Icon buttons for common actions.
  - Toggles or checkboxes for true/false settings.
  - Sliders, steppers, or inputs for numbers.
  - Menus for option lists.
  - Tabs for switching views.
- Use tooltips for icon-only buttons when the icon is not obvious.
- Do not let text overflow inside buttons, cards, menus, or inputs.

## Typography

- Use readable font sizes.
- Use large headings only for real hero sections.
- Use smaller headings inside panels, cards, sidebars, and dashboards.
- Do not use negative letter spacing.
- Do not scale font size directly with viewport width.
- Long text must wrap cleanly.

## Color

- Use a balanced palette.
- Avoid making the whole UI one color family.
- Keep contrast clear.
- Use color to show meaning, state, and priority.
- Do not rely only on color to explain important status.

## Images and media

- Use real or generated bitmap images when a website needs visual assets.
- Product, place, object, or person pages must show the actual subject clearly.
- Avoid dark, blurry, cropped, or generic stock-like media when the user needs to inspect details.
- Do not use decorative gradient blobs or orbs as a main visual idea.

## Motion

- Use motion only when it helps the user understand state or flow.
- Keep animations fast and subtle in work-focused tools.
- Avoid motion that blocks interaction.

## Accessibility

- Text must be readable.
- Interactive elements must be reachable by keyboard.
- Focus states must be visible.
- Tap targets must be large enough on mobile.
- Important information must not depend only on hover.

## Review

- Check desktop and mobile layouts.
- Check long text and empty states.
- Check loading, error, disabled, and selected states.
- Check that the UI matches the project type and audience.
