import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Baby,
  Briefcase,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  LogIn,
  MapPin,
  Menu,
  ScanLine,
  ShieldCheck,
  Smile,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { getMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button, Field, Input } from "../components/ui/index.jsx";
import logo from "../assets/logo.png";
import heroImage from "../assets/landing/hero.png";
import consultationImage from "../assets/landing/consultation.png";
import familyImage from "../assets/landing/family.png";
import smileImage from "../assets/landing/smile.png";

const navItems = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About us" },
  { href: "#services", label: "Services" },
  { href: "#career", label: "Career" },
  { href: "#book", label: "Book" },
  { href: "#contact", label: "Contact" },
];

const quickInfo = [
  {
    icon: MapPin,
    label: "Clinic location",
    value: "Baliuag, Bulacan",
  },
  {
    icon: Users,
    label: "Care focus",
    value: "Family dental care",
  },
  {
    icon: CalendarCheck,
    label: "Visits",
    value: "Coordinated clinic schedules",
  },
];

const services = [
  {
    icon: Smile,
    title: "Braces",
    text: "Structured orthodontic care for alignment, bite balance, and long-term smile confidence.",
  },
  {
    icon: ShieldCheck,
    title: "Crown & Bridges",
    text: "Restorative options designed to strengthen damaged teeth and replace missing spaces.",
  },
  {
    icon: Sparkles,
    title: "Veneers",
    text: "Cosmetic refinements for shape, shade, and a natural-looking front-tooth finish.",
  },
  {
    icon: CheckCircle2,
    title: "Cleaning",
    text: "Preventive visits that help keep gums, teeth, and daily oral routines on track.",
  },
  {
    icon: HeartPulse,
    title: "Dental Surgery",
    text: "Careful surgical support with clear preparation and patient comfort in mind.",
  },
  {
    icon: Activity,
    title: "Extractions",
    text: "Planned tooth removal for cases that need clinical attention and steady follow-up.",
  },
  {
    icon: Users,
    title: "Dentures",
    text: "Replacement teeth options that support eating, speaking, and everyday confidence.",
  },
  {
    icon: Baby,
    title: "Pediatric Dentistry",
    text: "Gentle visits for young patients, built around calm care and healthy habits.",
  },
  {
    icon: ScanLine,
    title: "X-ray",
    text: "Diagnostic imaging support for treatment planning and clearer clinical decisions.",
  },
  {
    icon: ClipboardCheck,
    title: "Root Canal Treatment",
    text: "Tooth-saving care for infected or painful teeth, with focused treatment planning.",
  },
];

const initialAccount = () => ({
  first_name: "",
  last_name: "",
  contact_number: "",
  email: "",
  password: "",
  confirm: "",
});

export default function Landing() {
  const {
    isAuthenticated,
    role,
    login,
    registerPatient,
    logout,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMode, setAccountMode] = useState("register");
  const [account, setAccount] = useState(initialAccount);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState(null);
  const closeMenu = () => setMenuOpen(false);

  const setAccountField = (key, value) => {
    setAccount((current) => ({ ...current, [key]: value }));
  };

  const submitPatientLogin = async (event) => {
    event.preventDefault();
    setAccountMessage(null);
    setAccountBusy(true);
    try {
      const signedIn = await login(account.email.trim(), account.password, true);
      if (signedIn.role !== "patient") {
        setAccountMessage({
          type: "error",
          text: "This booking form is for patient accounts. Staff can use the dashboard.",
        });
        return;
      }
      setAccountMessage({
        type: "success",
        text: "Signed in. You can now choose your appointment schedule.",
      });
      setAccount((current) => ({ ...initialAccount(), email: current.email }));
    } catch (err) {
      setAccountMessage({
        type: "error",
        text: getMessage(err, "Could not sign in."),
      });
    } finally {
      setAccountBusy(false);
    }
  };

  const submitPatientRegister = async (event) => {
    event.preventDefault();
    setAccountMessage(null);
    if (account.password.length < 6) {
      setAccountMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (account.password !== account.confirm) {
      setAccountMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setAccountBusy(true);
    try {
      await registerPatient({
        first_name: account.first_name.trim(),
        last_name: account.last_name.trim(),
        contact_number: account.contact_number.trim(),
        email: account.email.trim(),
        password: account.password,
      });
      setAccountMessage({
        type: "success",
        text: "Account created. You can now choose your appointment schedule.",
      });
      setAccount(initialAccount());
    } catch (err) {
      setAccountMessage({
        type: "error",
        text: getMessage(err, "Could not create the patient account."),
      });
    } finally {
      setAccountBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/80 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href="#home"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-3"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white p-1.5 shadow-card">
              <img
                src={logo}
                alt="Pingol Ramos Dental Clinic"
                className="h-full w-full object-contain"
              />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-display text-sm font-bold text-ink">
                Pingol Ramos
              </span>
              <span className="block text-[11px] font-semibold uppercase text-lime-700">
                Dental Clinic
              </span>
            </span>
          </a>

          <nav
            className="ml-auto hidden items-center gap-1 md:flex"
            aria-label="Primary navigation"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-canvas hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <a
            href="#book"
            className="ml-auto hidden h-10 items-center justify-center gap-2 rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800 md:inline-flex"
          >
            Book appointment <ArrowRight size={16} />
          </a>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted transition hover:bg-canvas hover:text-ink md:hidden"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {menuOpen && (
          <nav
            className="mx-4 mb-3 rounded-xl border border-line bg-white p-2 shadow-pop md:hidden"
            aria-label="Mobile navigation"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-canvas"
              >
                {item.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <main>
        <section
          id="home"
          className="relative min-h-[82svh] overflow-hidden pt-16 text-white sm:min-h-[78svh]"
        >
          <img
            src={heroImage}
            alt="Modern dental clinic reception with dentist welcoming a patient"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy-900/95 via-navy-800/78 to-navy-900/20" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent" />

          <div className="relative mx-auto flex min-h-[calc(82svh-4rem)] max-w-7xl items-center px-4 py-16 sm:min-h-[calc(78svh-4rem)] sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase text-lime-200 backdrop-blur">
                <MapPin size={14} /> Baliuag, Bulacan
              </span>
              <h1 className="mt-5 font-display text-4xl font-bold leading-tight">
                Pingol Ramos Dental Clinic
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/78">
                Calm, organized dental care for families, restorative needs,
                preventive visits, and confident smiles.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#book"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-lime-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-lime-600"
                >
                  Book an appointment <ArrowRight size={18} />
                </a>
                <a
                  href="#services"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-white/25 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  Explore services
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-auto -mt-10 grid max-w-7xl gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {quickInfo.map(({ icon: Icon, label, value }) => (
            <div key={label} className="card-base flex items-center gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-700">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-bold text-ink">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </section>

        <section id="about" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <img
                src={consultationImage}
                alt="Dentist explaining treatment options during a consultation"
                className="h-full min-h-[320px] w-full object-cover"
                loading="lazy"
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-lime-700">
                About us
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-ink">
                Clear guidance, careful records, and steady dental care.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                The clinic experience is designed around calm conversations,
                organized treatment planning, and a practical path from
                consultation to follow-up.
              </p>

              <div className="mt-7 grid gap-3">
                {[
                  "Preventive, cosmetic, restorative, and family-focused dental services.",
                  "A clean clinical environment with simple, patient-friendly coordination.",
                  "Treatment discussions that help patients understand the next step.",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-xl border border-line bg-white p-4 shadow-card"
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lime-100 text-lime-700">
                      <CheckCircle2 size={15} />
                    </span>
                    <p className="text-sm leading-6 text-ink">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="services"
          className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase text-lime-700">
                  Dental services
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold text-ink">
                  Care for everyday visits and specialized dental needs.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-muted">
                Services are presented as a public guide. The clinic team can
                confirm the right care path during consultation.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {services.map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="card-base p-5 transition hover:-translate-y-0.5 hover:shadow-pop"
                >
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-50 text-navy-700">
                    <Icon size={20} />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-ink">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-canvas px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <img
                src={smileImage}
                alt="Dental checkup focused on a healthy smile"
                className="aspect-[4/3] w-full rounded-2xl border border-line object-cover shadow-card"
                loading="lazy"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-navy-800 p-6 text-white shadow-card sm:col-span-2">
                <p className="text-xs font-bold uppercase text-lime-300">
                  Patient-first care
                </p>
                <h2 className="mt-3 font-display text-3xl font-bold">
                  Consistent care from consultation to follow-up.
                </h2>
              </div>
              <div className="card-base p-5">
                <ShieldCheck className="text-navy-700" size={24} />
                <h3 className="mt-4 text-sm font-bold text-ink">
                  Prepared visits
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Patients can review the service focus before coordinating a
                  clinic visit.
                </p>
              </div>
              <div className="card-base p-5">
                <Smile className="text-lime-700" size={24} />
                <h3 className="mt-4 text-sm font-bold text-ink">
                  Comfortable experience
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Patients are welcomed with calm communication and a clear next
                  step.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="career"
          className="scroll-mt-24 bg-navy-800 px-4 py-20 text-white sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase text-lime-300">
                Career
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold">
                Join a clinic culture built around care, order, and trust.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-navy-100/75">
                Pingol Ramos Dental Clinic values people who are attentive with
                patients, careful with records, and steady in a busy clinical
                day.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {[
                  "Clinical teamwork",
                  "Patient coordination",
                  "Clean, organized workflows",
                  "Respectful daily service",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <Briefcase size={18} className="text-lime-300" />
                    <span className="text-sm font-semibold text-white/90">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <img
              src={familyImage}
              alt="Friendly pediatric dental visit with a family"
              className="aspect-[4/3] w-full rounded-2xl border border-white/10 object-cover shadow-pop"
              loading="lazy"
            />
          </div>
        </section>

        <section
          id="book"
          className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div id="contact" className="scroll-mt-24">
              <p className="text-xs font-bold uppercase text-lime-700">
                Book an appointment
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold text-ink">
                Send an appointment request to the clinic team.
              </h2>
              <p className="mt-4 text-sm leading-7 text-muted">
                Choose your preferred date and time. Requests are added as
                pending appointments for staff confirmation.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="card-base p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-50 text-navy-700">
                    <MapPin size={20} />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-ink">Location</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Baliuag, Bulacan
                  </p>
                </div>
                <div className="card-base p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-lime-100 text-lime-700">
                    <CalendarCheck size={20} />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-ink">
                    Confirmation
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Staff can review and approve requests in Appointments.
                  </p>
                </div>
                <div className="card-base p-5 sm:col-span-2">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-50 text-navy-700">
                    <ClipboardCheck size={20} />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-ink">
                    Service guidance
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    The clinic can guide patients through preventive,
                    restorative, cosmetic, family, and procedure-based dental
                    care.
                  </p>
                </div>
              </div>
            </div>

            <div className="card-base p-5 sm:p-6">
              <div className="mb-5 flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime-100 text-lime-700">
                  <CalendarPlus size={21} />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    Appointment request
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Register or sign in as a patient, then book from your dashboard.
                  </p>
                </div>
              </div>

              {!isAuthenticated && (
                <>
                  <div className="mb-5 grid grid-cols-2 rounded-xl border border-line bg-canvas p-1">
                    <button
                      type="button"
                      onClick={() => { setAccountMode("register"); setAccountMessage(null); }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        accountMode === "register"
                          ? "bg-white text-navy-700 shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Register
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAccountMode("login"); setAccountMessage(null); }}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                        accountMode === "login"
                          ? "bg-white text-navy-700 shadow-sm"
                          : "text-muted hover:text-ink"
                      }`}
                    >
                      Sign in
                    </button>
                  </div>

                  {accountMode === "register" ? (
                    <form onSubmit={submitPatientRegister}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="First name" htmlFor="account-first" required>
                          <Input
                            id="account-first"
                            value={account.first_name}
                            onChange={(event) => setAccountField("first_name", event.target.value)}
                            autoComplete="given-name"
                            required
                          />
                        </Field>
                        <Field label="Last name" htmlFor="account-last" required>
                          <Input
                            id="account-last"
                            value={account.last_name}
                            onChange={(event) => setAccountField("last_name", event.target.value)}
                            autoComplete="family-name"
                            required
                          />
                        </Field>
                        <Field label="Contact number" htmlFor="account-contact" required>
                          <Input
                            id="account-contact"
                            value={account.contact_number}
                            onChange={(event) => setAccountField("contact_number", event.target.value)}
                            autoComplete="tel"
                            placeholder="09..."
                            required
                          />
                        </Field>
                        <Field label="Email address" htmlFor="account-email" required>
                          <Input
                            id="account-email"
                            type="email"
                            value={account.email}
                            onChange={(event) => setAccountField("email", event.target.value)}
                            autoComplete="email"
                            required
                          />
                        </Field>
                        <Field label="Password" htmlFor="account-password" required>
                          <Input
                            id="account-password"
                            type="password"
                            value={account.password}
                            onChange={(event) => setAccountField("password", event.target.value)}
                            autoComplete="new-password"
                            required
                          />
                        </Field>
                        <Field label="Confirm password" htmlFor="account-confirm" required>
                          <Input
                            id="account-confirm"
                            type="password"
                            value={account.confirm}
                            onChange={(event) => setAccountField("confirm", event.target.value)}
                            autoComplete="new-password"
                            required
                          />
                        </Field>
                      </div>
                      <Button type="submit" size="lg" className="mt-5 w-full" loading={accountBusy}>
                        <UserPlus size={18} /> Create account
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={submitPatientLogin}>
                      <div className="grid gap-4">
                        <Field label="Email address" htmlFor="patient-login-email" required>
                          <Input
                            id="patient-login-email"
                            type="email"
                            value={account.email}
                            onChange={(event) => setAccountField("email", event.target.value)}
                            autoComplete="email"
                            required
                          />
                        </Field>
                        <Field label="Password" htmlFor="patient-login-password" required>
                          <Input
                            id="patient-login-password"
                            type="password"
                            value={account.password}
                            onChange={(event) => setAccountField("password", event.target.value)}
                            autoComplete="current-password"
                            required
                          />
                        </Field>
                      </div>
                      <Button type="submit" size="lg" className="mt-5 w-full" loading={accountBusy}>
                        <LogIn size={18} /> Sign in to book
                      </Button>
                    </form>
                  )}

                  {accountMessage && (
                    <div
                      className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                        accountMessage.type === "success"
                          ? "bg-lime-50 text-lime-700"
                          : "bg-red-50 text-red-700"
                      }`}
                      role={accountMessage.type === "success" ? "status" : "alert"}
                    >
                      {accountMessage.text}
                    </div>
                  )}
                </>
              )}

              {isAuthenticated && role !== "patient" && (
                <div className="rounded-xl border border-line bg-canvas p-5">
                  <p className="text-sm font-semibold text-ink">Staff account detected</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Staff, dentists, and admins manage appointments inside the dashboard.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to="/dashboard"
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-navy-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-800"
                    >
                      Open dashboard
                    </Link>
                    <Button type="button" variant="outline" onClick={logout}>
                      Sign out
                    </Button>
                  </div>
                </div>
              )}

              {isAuthenticated && role === "patient" && (
                <Navigate to="/portal" replace />
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Pingol Ramos Dental Clinic"
              className="h-10 w-10 rounded-xl bg-white object-contain p-1 shadow-card"
            />
            <div>
              <p className="font-display text-sm font-bold text-ink">
                Pingol Ramos Dental Clinic
              </p>
              <p className="text-xs text-muted">Baliuag, Bulacan</p>
            </div>
          </div>
          <p className="text-xs text-muted">
            Copyright {new Date().getFullYear()} Pingol Ramos Dental Clinic. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
