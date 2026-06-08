# Responsive UI

Responsive UI instructions for desktop and mobile.

## Goal

The application must be clear and easy to use on both computer screens and mobile phones.

## General rules

- The app must work well on desktop, tablet, and mobile.
- The page must never feel broken, cramped, or cut off.
- The user should only scroll vertically on mobile.
- Do not allow the full page to move side to side.
- Horizontal scroll is allowed only inside a specific table or code block, not on the whole page.

## Mobile layout

- Use a mobile-first layout.
- Start with a single-column layout for phones.
- Add multi-column layouts only on larger screens.
- Stack cards, sections, forms, and panels vertically on mobile.
- Hide or move sidebars into a menu/drawer on mobile.
- Keep important actions easy to tap.
- Buttons and links should have enough spacing.
- Avoid tiny text on mobile.
- Avoid very large headings on mobile.

## Page width rules

- Set the page root to stay inside the screen width.
- Use `width: 100%` and `max-width: 100%`.
- Use `overflow-x: hidden` on `html`, `body`, `#root`, and main page containers.
- Use `box-sizing: border-box` for all elements.
- Make sure padding does not make elements wider than the screen.
- Do not use fixed widths that are wider than a phone screen.
- Avoid `100vw` when the element also has padding or negative margins.

## Text rules

- Long titles must wrap.
- Breadcrumbs must wrap or shrink on mobile.
- Long words, links, and technical names must not break the layout.
- Use `overflow-wrap: anywhere` or similar rules when needed.
- Do not use desktop-size headings on phones.
- Use smaller font sizes and tighter spacing on mobile.

## Cards and sections

- Cards must fit inside the screen.
- Use `min-width: 0` inside grid and flex layouts.
- Use `max-width: 100%` on cards and content blocks.
- Reduce padding on mobile.
- Avoid nested wide containers.
- Do not let shadows, borders, or absolute-positioned labels push content outside the screen.

## Grid and flex rules

- On mobile, use one column.
- Use two or more columns only from tablet or desktop breakpoints.
- In flex layouts, allow wrapping with `flex-wrap`.
- In CSS grid, use `minmax(0, 1fr)` for flexible columns.
- Add `min-width: 0` to children inside flex/grid containers.
- Check that each grid item can shrink on mobile.

## Images and media

- Images must use `max-width: 100%`.
- Images should keep their aspect ratio.
- SVG, canvas, video, and large media must not exceed the screen width.
- Avoid fixed media widths on mobile.
- Crop or scale media carefully so the main content is still readable.

## Tables

- Tables often need special mobile handling.
- A table may scroll horizontally inside its own wrapper.
- The whole page must not scroll horizontally because of a table.
- Wrap tables in a container with `overflow-x: auto`.
- Keep table text readable.
- Consider turning complex tables into cards on mobile if needed.

## Code blocks

- Code blocks must not widen the page.
- On mobile, either wrap code or allow horizontal scroll inside the code block only.
- Use `max-width: 100%`.
- Use smaller code font size on mobile.
- Long code lines must not push the full page sideways.

## Navigation

- Desktop can use a sidebar or top navigation.
- Mobile should use a simple header and menu button.
- Sidebars should become drawers or hidden menus on mobile.
- Mobile navigation must not cover important content by mistake.
- Sticky headers must not block content while scrolling.
- Breadcrumbs should remain readable and visible.

## Forms and controls

- Inputs must fit the screen width.
- Buttons must be easy to tap.
- Controls should stack on mobile.
- Avoid putting many controls in one horizontal row on phones.
- Text inside buttons must not overflow.

## Spacing

- Use smaller padding and margins on mobile.
- Use larger spacing on desktop only when there is enough room.
- Avoid large empty spaces that force too much scrolling.
- Avoid negative margins unless they are tested on mobile.

## Desktop layout

- Use the extra space well.
- Sidebars, right panels, and multi-column layouts are fine on desktop.
- Keep content width readable.
- Do not stretch text lines too wide.
- Use max-width containers for articles and documentation pages.

## Accessibility

- Text must be readable without zooming.
- Tap targets should be large enough.
- Contrast should be clear.
- Important controls should be reachable by keyboard.
- Do not rely only on hover for important actions.

## Testing

- Test at mobile width around `390px`.
- Test at small mobile width around `360px`.
- Test at tablet width around `768px`.
- Test at desktop width around `1366px`.
- Check the first screen, middle content, and bottom content.
- Check pages with long text.
