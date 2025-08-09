export type Dict = {
    nav: {
      services: string
      about: string
      faq: string
      contact: string
    }
    hero: {
      headline: string
      subtext: string
      quote: string
      view: string
    }
    about: {
      title: string
      description: string
      description2: string
      description3: string
      stats: {
        name: string
        value: string
      }[]
    }
    faq: {
      label: string
      title1: string
      title2: string
      questions: {
        q: string
        a: string
      }[]
    }
    footer: {
      subheading: string
      quickLinksTitle: string
      addressLabel: string
      hoursLabel: string
      emailLabel: string
      phoneLabel: string
      contactTitle: string
      copyright: string
    }
    checkout: {
      description: string
      product: string
      quantity: string
      total: string
      back: string
      title: string
      shipping: string
      payment: string
      subtotal: string
      empty: string
      first_name: string
      last_name: string
      ci: string
      phone: string
      email: string
      province: string
      municipality: string
      address: string
      instructions: string
      pay: string
      review: string
      errors: {
        nombre: string
        apellidos: string
        ci: string
        telefono: string
        email: string
        provincia: string
        municipio: string
        address: string
      }
    }
    success: {
      title: string
      message: string
      continue: string
    }
    error: {
      title: string
      message: string
      retry: string
      home: string
    }
    categories: {
      title: string
      subtitle: string
      noProducts: string
      list: {
        food: string
        clothing: string
        medicine: string
        appliances: string
        hygiene: string
        technology: string
      }
    }
    cart: {
      addToCart: string
      added: string
      search: string
      login_required: string
      title: string
      delete: string
      subtotal: string
      subtotaldetails: string
      checkout: string
      continue: string
      empty: string
    }
    login: {
      title: string
      email: string
      password: string
      submit: string
      success: string
      error: string
    }
    register: {
      title: string
      first_name: string
      last_name: string
      submit: string
      error: string
    }
    common: {
      loading: string
      required_fields: string
      greeting: string
      login: string
      logout: string
      back: string
      confirm_logout_title: string
      confirm_logout_message: string
      cancel: string
    }
  }
  