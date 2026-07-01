class Contact {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? company;
  final String? jobTitle;
  final String? notes;
  final String? remarks;
  final String? birthday;
  final String? language;
  final List<String>? tags;
  final String? address;
  final String? city;
  final String? state;
  final String? country;
  final String? zipCode;

  Contact({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.company,
    this.jobTitle,
    this.notes,
    this.remarks,
    this.birthday,
    this.language,
    this.tags,
    this.address,
    this.city,
    this.state,
    this.country,
    this.zipCode,
  });

  factory Contact.fromJson(Map<String, dynamic> json) {
    return Contact(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      email: json['email'] as String?,
      company: json['company'] as String?,
      jobTitle: json['jobTitle'] as String? ?? json['job_title'] as String?,
      notes: json['notes'] as String?,
      remarks: json['remarks'] as String?,
      birthday: json['birthday'] as String?,
      language: json['language'] as String?,
      tags: (json['tags'] as List<dynamic>?)?.cast<String>(),
      address: json['address'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      country: json['country'] as String?,
      zipCode: json['zipCode'] as String? ?? json['zip_code'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'email': email,
      'company': company,
      'job_title': jobTitle,
      'notes': notes,
      'remarks': remarks,
      'birthday': birthday,
      'language': language,
      'tags': tags,
      'address': address,
      'city': city,
      'state': state,
      'country': country,
      'zip_code': zipCode,
    };
  }
}
