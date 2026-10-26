Pod::Spec.new do |s|
  s.name           = 'OpenRouteLiveActivity'
  s.version        = '1.0.0'
  s.summary        = 'Live Activity de la grabación en curso'
  s.description    = 'Inicia, actualiza y termina la Live Activity que muestra la grabación en la pantalla bloqueada.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'ActivityKit'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,swift}"
end
