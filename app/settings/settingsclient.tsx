"use client";

import { useState, useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faCreditCard, faLayerGroup, faMobileScreenButton, faPen, faPlus, faRotateRight, faShieldHalved, faSliders, faTrash } from "@fortawesome/free-solid-svg-icons";
import Navbar from "@/app/components/Navbar";
import CustomSelect from "@/app/components/CustomSelect";
import ConfirmationModal from "@/app/components/ConfirmationModal";
import Skeleton from "@/app/components/Skeleton";
import { CARD_TYPE_ICONS } from "@/app/components/PaymentMethod";
import { useCards } from "@/app/components/CardsProvider";
import { useCurrency } from "@/app/components/CurrencyProvider";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { getServerThemePreference, getThemePreference, setThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";
import { CARD_LIMIT_PER_TYPE, CARD_TYPE_LABELS, cardLimitMessage, maskedCardNumber, type CardType, type SavedCard } from "@/lib/payment";
import PersonalOptionSettings from "@/app/components/PersonalOptionSettings";
import CardFormModal from "./CardFormModal";

const THEMES: { value: ThemePreference; label: string }[] = [{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }];
/** Credit first: it is the type people most often want to tell apart. */
const GROUPS: CardType[] = ["credit", "debit"];
const SETTINGS_TABS = [
  { id: "preferences", label: "Preferences", icon: faSliders },
  { id: "cards", label: "Cards", icon: faCreditCard },
  { id: "categories", label: "Categories", icon: faLayerGroup },
  { id: "upi-apps", label: "UPI apps", icon: faMobileScreenButton },
];
const subscribeSection = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
  return () => { window.removeEventListener("hashchange", notify); window.removeEventListener("popstate", notify); };
};
const getSection = () => SETTINGS_TABS.find((tab) => `#${tab.id}` === window.location.hash)?.id ?? "preferences";
const serverSection = () => "preferences";
function selectSection(id: string) {
  window.history.pushState(null, "", `#${id}`);
  window.dispatchEvent(new Event("hashchange"));
}


export default function SettingsClient() {
  const { currency, options, setCurrency, loading: currencyLoading } = useCurrency();
  const { cards, loading: cardsLoading, error: cardsError, reload, removeCard } = useCards();
  const { showNotification } = useNotification();
  const activeSection = useSyncExternalStore(subscribeSection, getSection, serverSection);
  const theme = useSyncExternalStore(subscribeTheme, getThemePreference, getServerThemePreference);
  const [editing, setEditing] = useState<{ card?: SavedCard; type: CardType } | null>(null);
  const [deleting, setDeleting] = useState<SavedCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/cards", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleting.id }) });
      if (!res.ok && res.status !== 404) throw new Error("Delete failed");
      removeCard(deleting.id);
      showNotification(`${deleting.name} removed`, "success");
      setDeleting(null);
    } catch {
      showNotification("Couldn’t delete the card. Try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return <>
    <Navbar />
    <main id="main-content" tabIndex={-1} className="app-shell">
      <div className="page-heading"><div><h1>Settings</h1><p>Manage your preferences, cards, categories, and UPI apps.</p></div></div>
      <div className="settings-layout">
        <div className="settings-nav" role="tablist" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`settings-tab-${tab.id}`} className="nav-link" aria-selected={activeSection === tab.id} aria-controls="settings-panel" tabIndex={activeSection === tab.id ? 0 : -1} onClick={() => selectSection(tab.id)} onKeyDown={(event) => {
            let next = index;
            if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % SETTINGS_TABS.length;
            else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index + SETTINGS_TABS.length - 1) % SETTINGS_TABS.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = SETTINGS_TABS.length - 1;
            else return;
            event.preventDefault();
            selectSection(SETTINGS_TABS[next].id);
            document.getElementById(`settings-tab-${SETTINGS_TABS[next].id}`)?.focus();
          }}><FontAwesomeIcon icon={tab.icon} aria-hidden="true" />{tab.label}</button>)}
        </div>
        <div id="settings-panel" role="tabpanel" aria-labelledby={`settings-tab-${activeSection}`} tabIndex={0} className="stack min-w-0">
          {activeSection === "preferences" && <section id="preferences" className="panel settings-section" aria-labelledby="preferences-heading">
            <div className="panel-heading"><h2 id="preferences-heading"><FontAwesomeIcon icon={faSliders} className="heading-icon" aria-hidden="true" />Preferences</h2></div>
            <div className="settings-row">
              <div><p className="font-medium" id="currency-label">Display currency</p><p className="muted text-xs">Used for every amount in the app. Saved to your account.</p></div>
              {currencyLoading ? <Skeleton height={46} /> : <CustomSelect id="settings-currency" label="Display currency" value={currency} onChange={(value) => void setCurrency(value)} options={options.map((option) => ({ value: option.symbol, label: `${option.symbol} ${option.label} · ${option.name}` }))} />}
            </div>
            <div className="settings-row">
              <div><p className="font-medium" id="theme-label">Appearance</p><p className="muted text-xs">System follows your device setting. Saved on this browser.</p></div>
              <div className="segmented" role="radiogroup" aria-labelledby="theme-label">
                {THEMES.map((option) => <button key={option.value} type="button" role="radio" className="segment flex-1 justify-center" aria-checked={theme === option.value} tabIndex={theme === option.value ? 0 : -1} onClick={() => setThemePreference(option.value)} onKeyDown={(event) => {
                  const index = THEMES.findIndex((item) => item.value === theme);
                  const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
                  if (!step) return;
                  event.preventDefault();
                  const next = THEMES[(index + step + THEMES.length) % THEMES.length];
                  setThemePreference(next.value);
                  (event.currentTarget.parentElement?.querySelector(`[data-value="${next.value}"]`) as HTMLElement | null)?.focus();
                }} data-value={option.value}>{theme === option.value && <FontAwesomeIcon icon={faCircleCheck} aria-hidden="true" />}{option.label}</button>)}
              </div>
            </div>
          </section>}

          {activeSection === "cards" && <section id="cards" className="panel settings-section" aria-labelledby="cards-heading">
            <div className="panel-heading">
              <div>
                <h2 id="cards-heading"><FontAwesomeIcon icon={faCreditCard} className="heading-icon" aria-hidden="true" />Cards</h2>
                <p className="muted mt-1">Save debit and credit cards to tag card payments. Up to {CARD_LIMIT_PER_TYPE} of each.</p>
              </div>
            </div>
            <p className="inline-note mb-6"><FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" /><span>Finex stores only a nickname and the last 4 digits. Full card numbers, CVV, PIN, OTP and expiry dates are never collected.</span></p>

            {cardsLoading ? <div className="grid gap-3" aria-hidden="true"><Skeleton height={20} width={160} /><div className="card-grid"><Skeleton height={68} /><Skeleton height={68} /></div></div>
            : cardsError ? <div className="error-state" role="alert"><p><FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />Couldn’t load your cards.</p><button type="button" className="btn btn-sm" onClick={reload}><FontAwesomeIcon icon={faRotateRight} />Retry</button></div>
            : GROUPS.map((type) => {
              const group = cards.filter((card) => card.type === type);
              const full = group.length >= CARD_LIMIT_PER_TYPE;
              const label = CARD_TYPE_LABELS[type];
              return <div key={type} className="card-group" aria-labelledby={`${type}-cards-heading`} role="group">
                <div className="card-group-heading">
                  <h3 id={`${type}-cards-heading`}><FontAwesomeIcon icon={CARD_TYPE_ICONS[type]} className="heading-icon" aria-hidden="true" />{label} cards <span className="count-badge"><span aria-hidden="true">{group.length}/{CARD_LIMIT_PER_TYPE}</span><span className="sr-only">{group.length} of {CARD_LIMIT_PER_TYPE} saved</span></span></h3>
                  <button type="button" className="btn btn-sm" disabled={full} aria-describedby={full ? `${type}-limit` : undefined} onClick={() => setEditing({ type })}><FontAwesomeIcon icon={faPlus} />Add {label.toLowerCase()} card</button>
                </div>
                {full && <p id={`${type}-limit`} className="inline-note inline-note-warning mb-3"><FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" /><span>{cardLimitMessage(type)}</span></p>}
                {group.length === 0 ? <p className="empty-inline">No {label.toLowerCase()} cards added yet.</p> : <ul className="card-grid">
                  {group.map((card) => <li key={card.id} className="saved-card" data-type={card.type}>
                    <span className="saved-card-icon"><FontAwesomeIcon icon={CARD_TYPE_ICONS[card.type]} aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="saved-card-name">{card.name}</p>
                      <p className="saved-card-number"><span className="sr-only">{label} card ending in {card.last4}</span><span aria-hidden="true">{card.network ? `${card.network === "rupay" ? "RuPay" : card.network === "visa" ? "Visa" : "Mastercard"} · ` : ""}{label} Card {maskedCardNumber(card)}</span></p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" className="btn btn-icon btn-sm btn-ghost" aria-label={`Edit ${card.name}`} title="Edit" onClick={() => setEditing({ card, type: card.type })}><FontAwesomeIcon icon={faPen} /></button>
                      <button type="button" className="btn btn-icon btn-sm btn-ghost btn-danger" aria-label={`Delete ${card.name}`} title="Delete" onClick={() => setDeleting(card)}><FontAwesomeIcon icon={faTrash} /></button>
                    </div>
                  </li>)}
                </ul>}
              </div>;
            })}
          </section>}
          {activeSection === "categories" && <PersonalOptionSettings kind="category" />}
          {activeSection === "upi-apps" && <PersonalOptionSettings kind="upiApp" />}
        </div>
      </div>
    </main>
    {editing && <CardFormModal card={editing.card} initialType={editing.type} onClose={() => setEditing(null)} />}
    {deleting && <ConfirmationModal title={`Delete ${deleting.name}?`} message="Past expenses paid with this card stay as card payments but will no longer show which card was used." confirmText="Delete card" isDangerous isLoading={isDeleting} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />}
  </>;
}
