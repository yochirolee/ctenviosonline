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
    madeby: string
  }
  checkout: {
    description: string
    product: string
    quantity: string
    label: string
    total: string
    back: string
    title: string
    shipping: string
    shipping1: string
    payment: string
    subtotal: string
    empty: string
    first_name: string
    last_name: string
    ci: string
    addressExact: string
    addressExact_placeholder: string
    instructions_label: string
    phone: string
    phoneeu: string
    email: string
    province: string
    municipality: string
    address: string
    address1eu: string
    address2eu: string
    cityeu: string
    stateeu: string
    zipeu: string
    instructions: string
    pay: string
    directPay: string
    review: string
    shippingcuba: string
    shippingeu: string
    tax: string
    shipping_label: string
    card_fee_label: string
    card_fee_note: string
    total_with_card: string
    errors: {
      nombre: string
      apellidos: string
      ci: string
      telefono: string
      telefonoeu: string
      email: string
      provincia: string
      municipio: string
      address: string
      address1eu: string
      cityeu: string
      stateeu: string
      zipeu: string
    },
    available: string
    available_message: string
    available_message2: string
    weight: string
    weight_unit: string
    provider: string
    quoting: string
    quote_not_available: string
    quote_estimated: string
    provider_unavailable: string
    shipping_breakdown_title: string
    shipping_breakdown_weight_pre: string
    shipping_breakdown_weight_post: string
  }
  success: {
    title: string
    message: string
    continue: string
    confirmingBody: string
    confirmingTitle: string
    view_orders: string
    confirming_message: string
    view_order: string
    orders_created : string
    order_number: string
    see_details: string
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
      h24: string
      food: string
      clothing: string
      medicine: string
      appliances: string
      hygiene: string
      technology: string
      school:string
      toys:string
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
    forgot: string
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
    orders: string
  }
  spotlight?: {
    title: string
    subtitle?: string
    addToCart: string
    added: string
    login_required?: string
    viewAll?: string
  }
  bestsellers: {
    title: string
    subtitle: string
  }
  location_banner: {
    location_selected: string
    location_selected_change: string
    location_select: string
    location_select_required: string
    location_select_required1: string
    location_municipality: string
    location_city: string
    where_title: string
    where_subtitle: string
    country_us: string
    country_cu: string
    province_placeholder: string
    municipality_placeholder: string
    save: string
    change: string
  }
  orders: {
    title: string
    empty: string
    login_needed: string
    see_detail: string
    continue_shopping: string
    order_label: string
    method_label: string
    estimated: string
    errors: {
      load_failed: string
      network: string
    }
    statuses: {
      pending: string
      paid: string
      failed: string
      delivered: string
      requires_action: string
      canceled: string
    }
    product_fallback: string
  }
  order_detail: {
    error_title: string
    not_found: string
    back_to_orders: string

    order_label: string
    payment_title: string
    shipping_title: string
    delivery_title: string
    products_title: string
    back_to_history: string
    continue_shopping: string

    labels: {
      provider: string
      mode: string
      state: string
      authorization: string
      reference: string
      utn: string
      card: string
      card_generic: string
      invoice: string
      transaction: string
      checkout_session: string
      paid_on: string
      view_payment_link: string
      owner: string
      owner_name: string
      recipient: string
      email: string
      phone: string
      address: string
      city_state_zip: string
      municipality_province: string
      ci: string

      delivery_state: string
      delivered: string
      delivery_date: string
      notes: string
      view_delivery_photo: string
      view_full_size: string
      no_photo: string
    }

    totals: {
      subtotal: string
      taxes: string
      shipping: string
      total_wo_fee: string
      card_fee_label: string
      total_with_card: string
    }
    product_fallback: string
    errors: {
      load_failed: string
      network: string
    }
    statuses?: Partial<Record<'pending' | 'paid' | 'failed' | 'delivered' | 'requires_action' | 'canceled' | string, string>>
  }
  card_modal: {
    title: string
    total_label: string
    disclaimer: string
    fields: {
      card_number: string
      month: string
      year: string
      cvv: string
      zip: string
      name_on_card: string
      name_on_card_placeholder: string
    }
    placeholders: {
      card_number: string
      month: string
      year: string
      cvv3: string
      cvv4: string
      zip: string
    }
    actions: {
      cancel: string
      pay_now: string
      processing: string
    }
    errors: {
      card_number_invalid: string
      month_invalid: string
      year_invalid: string
      year_expired: string
      expired: string
      cvv_len: string
      cvv_len_amex: string
      zip_invalid: string
      name_required: string
    }
  },
  encargos: {
    open_button: string
    drawer_title: string
    empty: string
    total_items: string
    subtotal: string
    remove: string
    clear_all: string
    remove_confirm: string
    removed_toast: string
    remove_error_toast: string
    proceed_to_checkout: string
    loading: string
    view_in_source_generic: string
    view_in_amazon: string
    view_in_shein: string
    vendor_amazon: string
    vendor_shein: string
    vendor_external: string
    id_label: string
    open_drawer_aria: string
    close_drawer_aria: string
    added_toast: string
  },
  recipients: {
    title: string
    new: string
    empty: string
    default_badge: string
    set_default: string
    edit: string
    delete: string
    confirm_delete: string
    notes_label: string
    label_placeholder: string
    select_state: string
    save: string
    update: string
    toasts: {
      created: string
      updated: string
      deleted: string
      made_default: string
      save_failed: string
      delete_failed: string
      default_failed: string
    }
  }
  
}
