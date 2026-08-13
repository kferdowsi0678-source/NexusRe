import { en } from './en';

/**
 * French dictionary.
 *
 * Typed as `typeof en`, so a missing, extra or misspelled key is a compile
 * error rather than a silent runtime fallback. When you add a key to `en.ts`,
 * `npx tsc --noEmit` will point here until the French copy is supplied.
 *
 * Tone: professional, conservative reinsurance French (marché de la
 * réassurance) — the audience is African cedants/brokers and European
 * reinsurers, not consumers.
 */
export const fr: typeof en = {
  common: {
    appName: 'NexusRe',
    tagline: 'Plateforme digitale de placement en réassurance',
    loading: 'Chargement...',
    language: 'Langue',
    actions: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      submit: 'Soumettre',
      upload: 'Téléverser',
      download: 'Télécharger',
      search: 'Rechercher',
      filter: 'Filtrer',
      clearFilters: 'Réinitialiser les filtres',
      create: 'Créer',
      edit: 'Modifier',
      update: 'Mettre à jour',
      delete: 'Supprimer',
      view: 'Consulter',
      viewAll: 'Tout consulter',
      close: 'Fermer',
      confirm: 'Confirmer',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      retry: 'Réessayer',
      refresh: 'Actualiser',
      send: 'Envoyer',
      add: 'Ajouter',
      remove: 'Retirer',
      select: 'Sélectionner',
      accept: 'Accepter',
      decline: 'Refuser',
      export: 'Exporter',
    },
    labels: {
      status: 'Statut',
      type: 'Type',
      lineOfBusiness: 'Branche d’activité',
      organization: 'Organisation',
      emailAddress: 'Adresse e-mail',
      password: 'Mot de passe',
      firstName: 'Prénom',
      lastName: 'Nom',
      role: 'Rôle',
      roles: 'Rôle(s)',
      currency: 'Devise',
      date: 'Date',
      allStatuses: 'Tous les statuts',
      allTypes: 'Tous les types',
      allLines: 'Toutes les branches',
    },
    states: {
      empty: 'Aucun élément à afficher pour le moment.',
      error: 'Une erreur est survenue. Veuillez réessayer.',
      networkError:
        'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.',
      required: 'Ce champ est obligatoire.',
    },
  },

  nav: {
    dashboard: 'Tableau de bord',
    submissions: 'Soumissions',
    opportunities: 'Opportunités',
    appetite: 'Appétit au risque',
    organizations: 'Organisations',
    users: 'Utilisateurs',
    audit: 'Audit',
    forms: 'Formulaires',
    profile: 'Profil',
    logout: 'Déconnexion',
    loggingOut: 'Déconnexion en cours...',
    openMenu: 'Ouvrir le menu principal',
  },

  notifications: {
    title: 'Notifications',
    markAllRead: 'Tout marquer comme lu',
    empty: 'Aucune notification.',
    ariaLabel: 'Notifications',
    ariaLabelWithUnread: 'Notifications, {count} non lues',
  },

  auth: {
    login: {
      title: 'Connectez-vous à votre compte',
      emailPlaceholder: 'Adresse e-mail',
      passwordPlaceholder: 'Mot de passe',
      forgotPassword: 'Mot de passe oublié ?',
      submit: 'Se connecter',
      submitting: 'Connexion en cours...',
      noAccount: 'Vous n’avez pas de compte ?',
      registerLink: 'Créer un compte',
      failed: 'Échec de la connexion. Veuillez vérifier vos identifiants.',
      testCredentials: 'Identifiants de test :',
    },
    register: {
      title: 'Créez votre compte',
      passwordHint: '8 caractères minimum',
      confirmPassword: 'Confirmer le mot de passe',
      selectOrganization: 'Sélectionnez une organisation',
      submit: 'Créer le compte',
      submitting: 'Création du compte...',
      haveAccount: 'Vous avez déjà un compte ?',
      signInLink: 'Se connecter',
      passwordMismatch: 'Les mots de passe ne correspondent pas',
      organizationRequired: 'Veuillez sélectionner une organisation',
      roleRequired: 'Veuillez sélectionner au moins un rôle',
      failed: 'Échec de l’inscription. Veuillez réessayer.',
    },
    forgotPassword: {
      title: 'Réinitialiser votre mot de passe',
      description:
        'Saisissez votre adresse e-mail et nous vous enverrons un lien de réinitialisation.',
      emailPlaceholder: 'Adresse e-mail',
      submit: 'Envoyer le lien',
      submitting: 'Envoi en cours...',
      backToLogin: 'Retour à la connexion',
      sentTitle: 'Consultez votre messagerie',
      sentDescription:
        'Si un compte existe pour {email}, vous recevrez sous peu un lien de réinitialisation du mot de passe.',
      returnToLogin: 'Retour à la connexion',
    },
  },

  dashboard: {
    greeting: 'Bienvenue, {name} !',
    subtitle: 'Tableau de bord {role}',
    stats: {
      totalSubmissions: 'Total des soumissions',
      pendingReview: 'En attente d’examen',
      completed: 'Terminées',
      activeQuotes: 'Cotations en cours',
      boundPremium: 'Primes placées',
    },
    links: {
      viewAllSubmissions: 'Consulter toutes les soumissions',
      viewPending: 'Consulter les soumissions en attente',
      viewCompleted: 'Consulter les soumissions terminées',
      viewOpportunities: 'Consulter les opportunités',
    },
    quickActions: {
      title: 'Actions rapides',
      createSubmission: 'Créer une soumission',
      viewAllSubmissions: 'Consulter toutes les soumissions',
      browseOpportunities: 'Parcourir les opportunités',
      manageAppetite: 'Gérer l’appétit au risque',
    },
    recent: {
      title: 'Soumissions récentes',
      empty: 'Aucune soumission pour le moment.',
      viewAll: 'Tout consulter',
    },
    admin: {
      title: 'Accès administrateur',
      description:
        'Vous disposez de privilèges d’administrateur. Vous pouvez gérer les organisations, les utilisateurs et les paramètres du système.',
    },
  },

  status: {
    draft: 'Brouillon',
    submitted: 'Soumise',
    under_review: 'En cours d’examen',
    quoted: 'Cotée',
    negotiating: 'En négociation',
    bound: 'Placée',
    declined: 'Refusée',
    expired: 'Expirée',
  },

  quoteStatus: {
    indication: 'Indication',
    firm_offer: 'Offre ferme',
    accepted: 'Acceptée',
    declined: 'Refusée',
    expired: 'Expirée',
  },

  quoteType: {
    indication: 'Indication',
    firm_order: 'Ordre ferme',
    binding: 'Engagement',
  },

  submissionType: {
    treaty: 'Traité',
    facultative: 'Facultative',
  },

  lineOfBusiness: {
    property: 'Dommages aux biens',
    casualty: 'Responsabilité et accidents',
    energy: 'Énergie',
    marine: 'Maritime et transport',
    aviation: 'Aviation',
    cyber: 'Cyber',
    political_violence: 'Violence politique',
    agriculture: 'Agriculture',
    engineering: 'Risques techniques',
    professional_indemnity: 'Responsabilité civile professionnelle',
    motor: 'Automobile',
    liability: 'Responsabilité civile',
  },

  organizationType: {
    cedant: 'Cédante',
    broker: 'Courtier',
    reinsurer: 'Réassureur',
    admin: 'Administrateur',
  },

  role: {
    super_admin: 'Super administrateur',
    org_admin: 'Administrateur d’organisation',
    cedant_user: 'Utilisateur cédante',
    broker_user: 'Utilisateur courtier',
    reinsurer_underwriter: 'Souscripteur réassurance',
    reinsurer_admin: 'Administrateur réassureur',
  },
};
