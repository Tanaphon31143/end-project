---
name: School Command Center
description: A clear, calm visual system for managing school information.
colors:
  canvas: "#fafafa"
  surface: "#ffffff"
  ink: "#000000"
  muted-ink: "#666666"
  action-hover: "#383838"
  quiet-hover: "#f2f2f2"
  quiet-border: "#ebebeb"
  dark-canvas: "#000000"
  dark-ink: "#ededed"
  admin-sidebar-background: "#082a54"
  admin-sidebar-active: "#1473f5"
  admin-sidebar-hover: "#ffffff1a"
  admin-sidebar-group-background: "#ffffff10"
  admin-sidebar-text: "#d7e4f3"
  admin-sidebar-active-text: "#ffffff"
  admin-sidebar-subtle-state: "rgba(255, 255, 255, 0.10)"
  admin-sidebar-focus: "#ffffff"
  admin-sidebar-logout: "#ff6b75"
  admin-sidebar-logout-hover: "#ff9ca3"
  admin-sidebar-logout-hover-background: "rgba(244, 63, 94, 0.14)"
  # Route-scoped tokens for /admin/announcements
  announcement-hero-deep: "#09264f"
  announcement-hero-middle: "#123f78"
  announcement-hero-end: "#19548a"
  announcement-header-hover: "#1268f5"
  announcement-blue: "#1463f3"
  announcement-canvas: "#f0f5fc"
  announcement-shell-canvas: "#edf5fc"
  announcement-surface: "#ffffff"
  announcement-ink: "#142b50"
  announcement-muted: "#607696"
  announcement-line: "#d5e1f1"
  announcement-published: "#10714e"
  announcement-published-soft: "#e7f7ee"
  announcement-scheduled: "#94600b"
  announcement-hidden: "#b53550"
  user-management-canvas: "#f1f7ff"
  user-management-ink: "#14284a"
  user-management-muted: "#536b8d"
  user-management-blue: "#0b5fff"
  user-management-line: "#dce7f6"
  user-management-hero-light: "rgba(244, 249, 255, 0.92)"
  user-management-hero-navy: "rgba(4, 28, 60, 0.86)"
  user-management-header-dark: "rgba(3, 26, 56, 0.58)"
  user-management-header-light: "rgba(244, 249, 255, 0.74)"
  user-management-header-light-ink: "#122b4d"
  user-management-focus: "#80b6ff"
typography:
  display:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: "48px"
    letterSpacing: "-2.4px"
  body:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "32px"
  label:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
  heading-mobile:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "32px"
    fontWeight: 650
    lineHeight: "35px"
  body-small:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "24px"
  meta:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "18px"
  form-label:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: "20px"
  footnote:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "16px"
  mono:
    fontFamily: "Consolas, monospace"
    fontSize: "0.9em"
  announcement-headline:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "1.35"
  announcement-body:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.6"
  announcement-label:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "1.5"
  user-management-heading:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "1.35"
    letterSpacing: "-0.025em"
  user-management-body:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.7"
  user-management-table:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.55"
  user-management-section-heading:
    fontFamily: "SF Thonburi, Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "1.5"
rounded:
  check: "4px"
  code: "6px"
  control: "10px"
  mark: "12px"
  card: "20px"
  mobile-card: "16px"
  pill: "128px"
  announcement-panel: "16px"
  announcement-control: "9px"
  announcement-status: "5px"
  user-management-panel: "13px"
  user-management-control: "8px"
  admin-sidebar-submenu: "8px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "48px"
  xl: "60px"
  page: "120px"
  announcement-xs: "8px"
  announcement-sm: "16px"
  announcement-md: "24px"
  user-management-page: "20px"
  user-management-panel: "20px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  button-announcement-primary:
    backgroundColor: "{colors.announcement-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.announcement-control}"
    padding: "10px 16px"
    height: "43px"
  card-announcement:
    backgroundColor: "{colors.announcement-surface}"
    textColor: "{colors.announcement-ink}"
    rounded: "{rounded.announcement-panel}"
    padding: "16px 24px"
  chip-announcement-published:
    backgroundColor: "{colors.announcement-published-soft}"
    textColor: "{colors.announcement-published}"
    rounded: "{rounded.announcement-status}"
    padding: "3px 7px"
  button-user-management-primary:
    backgroundColor: "{colors.user-management-blue}"
    textColor: "{colors.surface}"
    rounded: "{rounded.user-management-control}"
    padding: "8px 13px"
    height: "40px"
  card-user-management-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.user-management-ink}"
    rounded: "{rounded.user-management-panel}"
    padding: "20px"
  input-user-management-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.user-management-ink}"
    rounded: "{rounded.user-management-control}"
    padding: "0 12px"
    height: "42px"
  nav-admin-main-active:
    backgroundColor: "{colors.admin-sidebar-active}"
    textColor: "{colors.surface}"
    rounded: "9px"
    padding: "10px 13px"
    height: "46px"
  nav-admin-submenu-current:
    backgroundColor: "{colors.admin-sidebar-active}"
    textColor: "{colors.admin-sidebar-active-text}"
    rounded: "{rounded.admin-sidebar-submenu}"
    padding: "7px 11px 7px 12px"
    height: "38px"
    iconSize: "19px"
---

# Design System: School Command Center

## Overview

**Creative North Star: "The Clear School Command Center"**

The current system is intentionally quiet and direct: a white surface, black ink, restrained gray supporting text, and generous space make the first action obvious. It feels like a focused control room for school work rather than a decorative marketing surface.

The visual language is built around clarity at a glance. SF Thonburi gives Thai labels a friendly, contemporary voice; short content blocks, strong left alignment, and a small set of pill-shaped actions keep navigation and decisions easy to scan. The light theme is the primary expression, with the existing dark-mode fallback treated as a secondary system state.

**Key Characteristics:**
- White-first canvas with high-contrast black anchors
- Calm, generous spacing and left-aligned content
- SF Thonburi for interface text and Consolas for code-like inline labels
- Rounded pill actions with restrained hover changes
- Minimal decoration; hierarchy comes from type, spacing, and contrast

## Colors

The palette is monochrome and white-led, using black for decisive actions and gray only for supporting information.

### Primary
- **Command Black** ({colors.ink}): Use for primary actions and the strongest text hierarchy.

### Neutral
- **Quiet Canvas** ({colors.canvas}): The light page background.
- **Clean Surface** ({colors.surface}): The main content surface.
- **Muted Ink** ({colors.muted-ink}): Supporting copy and secondary information.
- **Quiet Border** ({colors.quiet-border}): Secondary control borders and subtle separation.
- **Action Hover Gray** ({colors.action-hover}): Hover state for primary actions.
- **Quiet Hover** ({colors.quiet-hover}): Hover state for secondary actions.

### Named Rules
**The White-First Rule.** Keep the visual field predominantly white; black is reserved for hierarchy and action rather than decoration.

## Typography

**Display Font:** SF Thonburi (with Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif fallback)
**Body Font:** SF Thonburi (with Tahoma, Leelawadee UI, Arial, Helvetica, sans-serif fallback)
**Label/Mono Font:** Consolas for code-like labels

**Character:** Friendly, contemporary, and highly legible. SF Thonburi's Thai letterforms give the school workspace a more intentional voice while keeping dense labels and form instructions easy to scan.

### Hierarchy
- **Display** (600, 40px, 48px; -2.4px tracking): Primary page or hero heading; reduce to 32px / 40px on narrow screens.
- **Body** (400, 18px, 32px): Explanatory copy, capped around 440px in the current composition.
- **Label** (500, 14px, 20px): Action labels and compact interface controls.
- **Mono** (400, 0.9em, inherited line-height): Inline code or system identifiers.

### Named Rules
**The One Clear Heading Rule.** Give each surface one dominant heading before introducing supporting copy or actions.

## Layout

The current composition uses a centered, full-height page with a single content column capped at 800px. The main region is vertically spacious, left-aligned, and padded at 120px 60px on larger screens. Intro content is stacked with a 24px gap; action groups sit below with a 16px gap between controls.

At widths below 600px, page padding contracts to 48px 24px, the intro gap becomes 16px, and the heading scales to 32px / 40px. Preserve the single-column reading order and avoid horizontal overflow.

## Elevation & Depth

The system is flat by default. It does not use a shadow vocabulary; depth comes from the white surface against the light canvas, black-versus-gray hierarchy, spacing, and subtle borders on secondary controls.

### Named Rules
**The Flat Command Rule.** Do not add shadows to create importance; use position, contrast, and whitespace to signal what matters.

## Shapes

Actions use a generous pill silhouette with a 128px radius. Inline code uses a small 6px radius and a faint current-color background tint. The overall form language is soft at interaction points but otherwise plain and rectangular, keeping the interface legible and calm.

## Components

### Buttons
- **Shape:** Fully rounded pill (128px), 40px high.
- **Primary:** Black background with canvas-colored text, 0 16px horizontal padding, and an 8px icon-to-label gap when an icon is present.
- **Hover / Focus:** Primary shifts to action-hover gray; retain a visible keyboard focus treatment when extending the system.
- **Secondary:** White surface with a quiet border; hover shifts to quiet-hover and removes the border emphasis.

### Cards / Containers
- **Current status:** No reusable card component is implemented yet.
- **Guidance:** Prefer white surfaces and spacing before introducing borders or shadows.

### Inputs / Fields
- **Current status:** No input component is implemented yet.

### Navigation
- **Current status:** No reusable navigation component is implemented yet.

## Do's and Don'ts

### Do:
- **Do** preserve a white-first canvas and black primary hierarchy.
- **Do** use generous spacing to separate school information areas.
- **Do** keep controls short, clearly labeled, and easy to scan.
- **Do** use SF Thonburi for interface text and Consolas only for code-like content.
- **Do** maintain the narrow-screen padding and heading reduction pattern.
- **Do** keep the `/admin/users`, `/admin/teachers`, and `/admin/students` extensions inside the existing admin shell.
- **Do** show all six standard grades while keeping room counts and configured-level summaries tied to database data.

### Don't:
- **Don't** introduce bright accent colors without an explicit brand decision.
- **Don't** rely on shadows, gradients, or decoration to communicate hierarchy.
- **Don't** use dense multi-column layouts where a clear school workflow can remain single-column.
- **Don't** turn every piece of supporting information into a high-contrast action.
- **Don't** scope the shared admin sidebar to the three roster routes; only their page content, header treatment, and campus artwork are route-specific.
- **Don't** treat six visible grade choices as six configured levels, hide zero-room grades, or present the decorative campus illustration as a documentary photograph.

## Route-scoped subsystem: Admin Announcements

This extension applies to /admin/announcements and its route-only page styling. The user-pinned reference sets a school communication desk: publication status first, then the composer and announcement library.

Every admin route shares the same sidebar: 257px expanded and 78px collapsed, a flat #082a54 background, #d7e4f3 labels, a 50px circular school logo, plain ADMINISTRATOR text, and 46px main rows. Main selected links use #1473f5 with white text. Fine-pointer hover uses the shared student `.portal-sidebar-item` feedback: a #ffffff1a surface, a smooth 200ms ease-out transition, and a 6px visual row translation; the expanded user-management parent stays #ffffff10, while the selected submenu child uses the primary #1473f5 state. Submenu rows are 38px high and keep their 19px icons. The footer remains a plain school identity row with a divider. Hover turns and scales the main and submenu icons by 12deg and 1.1; press feedback translates the row 6px and scales it to .95. These transforms do not change sidebar layout geometry. Keep the settings SVG root static; only its outer path spins linearly over 3 seconds on hover or keyboard focus and pauses at its current angle when that state ends. Coarse pointers suppress hover feedback, and reduced-motion preferences disable transitions and transforms and keep the gear static. Keyboard focus keeps a visible outline. At widths up to 1023px, the sidebar becomes a drawer at min(280px, 85vw). The announcement route retains its pale-blue canvas, white 16px panels, four real status counts, and two-column composer/library workspace. The implementation uses a 44/56 split, stacks the panels below 1200px, and places the status cards in two columns below 768px. Locally bundled SF Thonburi carries Thai interface text. Green, amber, and rose pair status meanings with labels and icons. The announcement-specific #1268f5 accent remains for header hover; sidebar geometry and states are shared across admin routes.

### Announcement Typography

Keep the existing SF Thonburi family and its 400, 600, and 700 weights. The announcement route uses --ann-type-body: 1rem (16px) at 1.7–1.85 line height for announcement copy, editor text, and inputs; --ann-type-label: .875rem (14px) at about 1.65–1.8 for labels, buttons, and supporting copy; and --ann-type-caption: .8125rem (13px) at about 1.5 for counters and metadata. Section headings use 20px/1.5. The shared sidebar uses 257px expanded and 78px collapsed, a 50px circular logo, 46px main rows, 38px submenu rows with 19px icons, and the plain school identity footer. Its labels are 15px/600 with a 13px icon gap, 10px 13px padding, and 9px corners; the drawer activates at 1023px with width min(280px, 85vw). The header uses a 16px title and 13px breadcrumbs. Keep mobile search text at 16px and status filters in two columns when space is tight. Use #526781 for muted ink and #5b6f8b for placeholders.

The student dashboard announcement card keeps its student-workspace styles while sharing the announcement formatter and attachment delivery. Announcement page-specific styling stays route-scoped. No school-building image exists in project assets, so the approved navy gradient fallback is used for the announcement hero.

**The Announcement Route Boundary Rule.** Keep the shared admin sidebar consistent across routes, and keep the announcement canvas, header, panels, typography, status colors, and page composition scoped to /admin/announcements. User-management page content, its header treatment, and campus artwork remain scoped to their three routes.

**The Status Label Rule.** Pair each semantic state color with visible status text and an icon.

**The Bangkok Time Rule.** Keep scheduling and displayed time in the Asia/Bangkok context.

## Route-scoped subsystem: Admin User Management

This extension applies only to `/admin/users`, `/admin/teachers`, `/admin/students`, and the “จัดการผู้ใช้งาน” sidebar subgroup. It preserves the existing admin route structure and unrelated navigation while giving all three user-management routes the page content, header/search placement, and campus-hero treatment shown in the supplied references. The shared sidebar uses the same styling across every admin route; this subsystem does not introduce route-specific sidebar colors or geometry.

The route canvas is pale blue (#f1f7ff) with deep navy and white as its strongest anchors. Each route uses the decorative campus illustration in `public/images/admin-campus.webp` under a color overlay: All Users, Teacher Management, and Student Management share a light treatment with navy headings. The light hero explicitly uses #10284a for its title and #365579 for breadcrumbs and supporting copy so text remains legible over the campus image. The image is an illustration derived from the user reference, not a documentary campus photograph. The handwritten Khukhan signature asset appears on the All Users hero and hides at tablet widths. SF Thonburi remains the Thai interface family. The route heading is 34px/700 with -0.025em tracking and 1.35 line height on desktop, reducing to 28px on narrow screens; breadcrumbs are 13px, supporting copy is 16px/1.7, and compact table text is 13px/1.55.

The shared sidebar is 257px wide when expanded and 78px when collapsed, with a flat #082a54 background, #d7e4f3 labels, a 50px circular school logo, and plain ADMINISTRATOR text. Main rows are 46px high; the selected main route uses #1473f5 with white text. Fine-pointer hover follows the shared student `.portal-sidebar-item` effect with a #ffffff1a surface and smooth 200ms ease-out feedback. The expanded “จัดการผู้ใช้งาน” parent remains #ffffff10; the selected submenu child uses #1473f5. The three submenu rows are 38px high with 19px icons. The school identity footer remains a plain row separated by a divider. On hover, rows translate 6px visually while their 12deg icon turn and 1.1 scale match the student sidebar; press translates the row 6px and scales it to .95. These transforms preserve layout geometry. The settings SVG root stays static, while only its outer path spins linearly over 3 seconds on hover or keyboard focus and pauses at its current angle when that state ends. Coarse pointers suppress hover feedback; reduced-motion preferences disable transitions and transforms and keep the gear static. Keyboard focus uses a visible outline. The subgroup disclosure is initialized from the route on first render and then keeps its user-selected open/closed state across navigation in the shared admin layout; moving between routes does not automatically expand or collapse it. A direct page load on one of the three user-management routes starts with the subgroup expanded. The 66px sticky header and pale treatment remain specific to All Users, Teacher Management, and Student Management. All admin routes share the dashboard's global search styling: an inline white field up to 360px wide and 46px high, with 11px corners, a search icon, and a Ctrl+K hint beside the notification bell. On screens up to 639px, a circular search button opens a full-width field below the header with 16px input text. Outside clicks, Escape, and choosing a result close the expanded search. Notification and fullscreen controls use matching 44px white circles with centered icons across admin routes. Shared search and control styles live in AdminHeader.css; route backgrounds, page content, campus artwork, and header treatment remain scoped to the three roster routes.

All Users places four database-backed role summaries above its roster. Its trend badges use the caption “เพิ่มจากต้นเดือน” and compare the current account total with accounts whose `createdAt` predates the start of the current month; the rate and small area charts are data-derived rather than fixed sample values. Teacher and Student Management place a context selector beside the wider roster; Teacher stacks the panels below 900px and Student at 1350px and below. Teacher's four summaries include database totals and active/inactive ratios shown as rings. The context list always includes eight standard subject groups, each with its current teacher count; configured and unassigned groups remain data-backed too. Teacher email appears beneath the name in its compact roster. Students retains all six standard grades from ม.1 to ม.6 even when a grade has no configured room, while classroom counts and the configured-level summary follow the database. Its latest-access tile uses the maximum `auth_sessions.created_at` for student accounts, rather than the active-account count.

On All Users, the roster toolbar orders its actions as export, “เพิ่มผู้ใช้งาน”, then the table/card view switch. The add-user button and its role-selection popover live in the roster toolbar. The toolbar wraps on narrow screens while preserving this DOM and keyboard order.

The student workspace uses a 30/70 context/roster split on wide screens. Its fixed-column table has a 1000px minimum width and scrolls inside its panel on smaller screens. Student names and codes use 14px/600, table data uses 13px/1.5, and email, headers, and presence badges use 12px. Keep 10px vertical cell padding and 36px avatars rather than compressing rows to fit a fixed count. The centered 64px “ลำดับ” column uses tabular numerals and never wraps; numbering continues across pagination. The 216px action column keeps labeled controls and their icons intact. The header stays visible during table scrolling, and full names and emails remain available through the existing detail action and title text.

The teacher workspace uses 20px section headings, 15px/600 teacher names, 14px group names/table data/controls, and 13px email/header/presence text. Text uses 1.6 line height, with 12px vertical table padding, 40px avatars, and group options at least 52px tall. Long group names may wrap. The table keeps a 1060px minimum width inside its scroll container; its 168px status column and 96px labeled-action columns accommodate the larger text. The amber group label uses #805000 on #fff2da for stronger contrast. These typography rules stay scoped to the teacher route.

Real profile photos appear where available, with initials as the fallback. Roster tables keep a bounded height and their own scroll area, leaving pagination visible at the foot of each panel. The All Users summary changes from four columns to two at 850px. Student grade choices change from six columns to three at 460px, and classroom cards become one column at 460px. On mobile, All Users summary cards place the icon above a full-width text block and keep each value on one line. Teacher summary cards are 112px high, with a 32px icon beside the copy; their status ring sits at the bottom-right at 26px, and each number and unit stay together. Teacher subject groups and student classroom cards keep their count in a separate grid cell. Common route controls use 8px corners and 40–42px heights; main roster panels use white surfaces, 13px corners, and 20px desktop padding. The page uses a visible blue focus outline and disables route transitions under reduced motion. Subtle action, selected-room, and floating-menu shadows remain local to these route components rather than extending the global elevation vocabulary.

**The User Management Boundary Rule.** Keep roster content, the campus-hero variants, header treatment, and responsive page layout scoped to these user-management routes. Keep the admin sidebar shared across all admin routes. On teacher and student routes, show the selected direct main link and matching submenu child together so both the section and page are clear.

**The Roster Truth Rule.** Keep account totals, creation trends, subject-group counts, teacher-status ratios, classroom counts, latest access, and roster rows tied to database data. Show all six standard grades even when a grade has no configured room, and keep the configured-level summary tied to configured classrooms.
