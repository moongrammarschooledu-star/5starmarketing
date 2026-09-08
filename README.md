# 5STAR.M Estate & Builders — Website

A complete, responsive real-estate & construction business website for
**5STAR.M Estate & Builders**, built with Next.js, TypeScript and Tailwind CSS.

## 1. How to run the project

You need [Node.js](https://nodejs.org) 18 or newer installed.

```bash
npm install
npm run dev
```

Then open **http://localhost:3000** in your browser. The site auto-reloads
whenever you save a file.

> Note: the `&` in this folder's name breaks Windows' normal `npm`
> shortcuts for running local tools, so the scripts in `package.json` call
> `next`/`eslint` directly via `node` instead of the usual shorthand. You
> don't need to do anything differently — `npm run dev` just works.

To build for production:

```bash
npm run build
npm run start
```

## 2. How to change the logo

The logo is a hand-coded, scalable icon (not an image file) so it stays sharp
at every size and works on both light and dark backgrounds.

- Edit **`src/components/Logo.tsx`**:
  - `LogoIcon` — the roofline + hammer mark (SVG shapes).
  - `Logo` — the icon plus the "5 STAR.M / ESTATE & BUILDERS" wordmark.
- The browser-tab favicon is **`src/app/icon.svg`** — a matching, simplified
  version of the same mark.

If you'd rather use your original logo **image file** instead of the coded
version: drop the file into `public/images/logo.png`, then replace the
contents of `Logo.tsx` with a simple `<Image src="/images/logo.png" ... />`.

## 3. How to change business information

Everything — phone, WhatsApp number, email, address, director name, tagline,
social links — lives in **one file**:

`src/lib/site.ts`

Edit the values there and they update everywhere on the site automatically
(navbar, footer, contact section, WhatsApp links, click-to-call links).

## 4. How to add / edit properties

Property listings are demo data in **`src/lib/data/properties.ts`**.

Each property is one object in the `properties` array:

```ts
{
  id: "unique-id",
  title: "Property Title",
  type: "House", // "House" | "Flat" | "Plot" | "Commercial"
  purpose: "Buy", // "Buy" | "Sell" | "Invest"
  location: "Johar Town, Lahore",
  size: "10 Marla",
  price: "PKR 2.5 Crore", // or "Price on Request"
  paymentOption: "Cash / Easy Installments",
  description: "Short description...",
  image: "https://...", // property photo URL
}
```

Copy an existing object, change the values, and it will appear automatically
in the Properties section and its filters.

## 5. How to add / edit projects

Project portfolio data is in **`src/lib/data/projects.ts`** — same pattern:
copy an object in the `projects` array and edit its fields.

## 6. How to change images

- **Hero, About, Investment, Construction section photos**: each lives
  directly inside its component file (`src/components/Hero.tsx`,
  `About.tsx`, `InvestmentSection.tsx`, `ConstructionSection.tsx`) as an
  `<Image src="...">`. Replace the `src` with your own photo URL, or put a
  file in `public/images/` and use `src="/images/your-file.jpg"`.
- **Property/project photos**: edit the `image` field in
  `src/lib/data/properties.ts` / `projects.ts`.
- Demo photos currently come from Unsplash — swap them for your own
  professional property/site photography as it becomes available.

## 7. Contact form

The form on the Contact section posts to `src/app/api/contact/route.ts`,
which validates the submission and logs it to the server console. **It does
not yet email or SMS you the lead** — connect it to a provider such as
[Resend](https://resend.com), Nodemailer, or a CRM webhook before relying on
it for real inquiries. Until then, WhatsApp is the fastest channel and is
wired up throughout the site.

## 8. How to deploy on Vercel

1. Push this project to a GitHub repository.
2. Go to [vercel.com](https://vercel.com), click **New Project**, and import
   the repository.
3. Framework preset: **Next.js** (auto-detected). No extra configuration is
   required for the default build.
4. Click **Deploy**. Vercel will give you a live URL (e.g.
   `5starm.vercel.app`) — you can later attach your own domain
   (e.g. `5starm.com`) under Project → Settings → Domains.

## Project structure

```
src/
  app/
    layout.tsx        SEO metadata, fonts
    page.tsx           assembles all sections
    api/contact/        contact form endpoint
  components/           one file per section (Navbar, Hero, About, ...)
  lib/
    site.ts             business info (single source of truth)
    data/                properties.ts, projects.ts, services.ts
```
