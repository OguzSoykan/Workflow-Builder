// English UI catalog (FR-11). Keys are the Turkish source strings passed to t().
export const EN: Record<string, string> = {
  Araçlar: 'Tools',
  Adımlar: 'Steps',
  Alanlar: 'Fields',
  Oluştur: 'Create',
  Ayrıntılar: 'Details',
  'Tema: {mode}': 'Theme: {mode}',
  Sistem: 'System',
  Koyu: 'Dark',
  Açık: 'Light',
  ' (bağlı)': ' (connected)',
  ' (değer: {value})': ' (value: {value})',
  ' Genel AI bütçesi azalıyor.': ' The overall AI budget is running low.',
  ' · {issueCount} doğrulama sorunu': ' · {issueCount} validation issues',
  ' · çalıştırılabilir': ' · executable',
  '+{length} adım': '+{length} steps',
  '10.000 üzeri talepler yönetici onayına gider.': 'Requests above 10,000 go to manager approval.',
  '1–100 benzersiz seçenek girin; her seçenek 1–120 karakter olmalıdır.':
    'Enter 1–100 unique options; each option must be 1–120 characters.',
  '5 günü aşan izinler yönetici ve İK onayından geçer.':
    'Leave longer than 5 days needs manager and HR approval.',
  ': bağlı değil. Akışın çalışabilmesi için bu çıkışı bir adıma bağlayın.':
    ': not connected. Connect this output to a step so the workflow can run.',
  'AI WORKFLOW BUILDER': 'AI WORKFLOW BUILDER',
  'AI bu isteği yanıtlamadı. Açıklamayı iş akışına odaklayarak yeniden yazın.':
    'The AI declined this request. Rewrite the description to focus on the workflow.',
  'AI bütçesi doldu. Akışı elle düzenlemeye devam edebilirsiniz.':
    'The AI budget is used up. You can keep editing the workflow manually.',
  'AI durumu yükleniyor…': 'Loading AI status…',
  'AI geçerli bir akış üretemedi. Açıklamayı sadeleştirip tekrar deneyin.':
    'The AI could not produce a valid workflow. Simplify the description and try again.',
  'AI geçici olarak kullanılamıyor. Akışı elle düzenleyebilirsiniz.':
    'AI is temporarily unavailable. You can edit the workflow manually.',
  'AI hizmetine ulaşılamadı. Biraz sonra tekrar deneyin.':
    'Could not reach the AI service. Try again shortly.',
  'AI ile oluştur': 'Create with AI',
  Kilitli: 'Locked',
  'AI ile oluşturma bu sunucuda henüz etkin değil. Bulut hesabı yapılandırıldığında üyeler günde 1 kez kullanabilir.':
    'AI creation is not enabled on this server yet. Once cloud accounts are set up, members can use it once a day.',
  'AI ile oluşturmak için giriş yapın. Üyeler günde 1 kez kullanabilir.':
    'Sign in to create with AI. Members can use it once a day.',
  'AI isteği tamamlanamadı.': 'The AI request could not be completed.',
  'AI için önce e-postanızı doğrulayın.': 'Verify your email before using AI.',
  'AI modu': 'AI mode',
  'AI önerisi': 'AI proposal',
  'AI önerisi taslağa uygulandı.': 'The AI proposal was applied to the draft.',
  'AI şu an kapalı. Akışı elle düzenleyebilirsiniz.':
    'AI is turned off. You can edit the workflow manually.',
  'AI şu an kullanılamıyor. Akışı elle düzenleyebilirsiniz.':
    'AI is not available right now. You can edit the workflow manually.',
  'Adım adı': 'Step name',
  'Adım ekle': 'Add step',
  'Adım kaydı': 'Step log',
  'Adım kimliği zaten kullanılıyor.': 'This step ID is already in use.',
  'Adım paleti': 'Step palette',
  'Adım seçin': 'Select a step',
  'Adım türü değiştirilemez.': 'The step type cannot be changed.',
  'Adım çıkışları': 'Step outputs',
  'Adım özellikleri': 'Step properties',
  'Adımları bağla': 'Connect steps',
  'Adımı sil': 'Delete step',
  'Akış bağlantıları': 'Workflow connections',
  'Akış bulut kaydı için çok büyük.': 'The workflow is too large for cloud saving.',
  'Akış burada başlar': 'The workflow starts here',
  'Akış değişti; simülasyonu yeniden başlatın.': 'The workflow changed; restart the simulation.',
  'Akış reddedilir': 'The workflow is rejected',
  'Akış simüle edilemiyor; doğrulama sorunlarını kontrol edin.':
    'The workflow cannot be simulated; check the validation issues.',
  'Akış tamamlanır': 'The workflow completes',
  'Akış çalıştırılabilir; doğrulama sorunu yok.':
    'The workflow is executable; no validation issues.',
  'Akış öner': 'Suggest workflow',
  'Akışta başlangıç adımı yok; bir başlangıç adımı ekleyin.':
    'The workflow has no start step; add a start step.',
  'Akışta bitiş adımı yok; en az bir bitiş adımı ekleyin.':
    'The workflow has no end step; add at least one end step.',
  'Akışta giriş alanı yok.': 'The workflow has no input fields.',
  'Akışta {count} başlangıç adımı var; yalnız bir tane olmalı.':
    'The workflow has {count} start steps; there must be exactly one.',
  'Akışta {count} doğrulama sorunu var; taslak dışa aktarılabilir ama henüz çalıştırılamaz.':
    'The workflow has {count} validation issues; the draft can be exported but cannot run yet.',
  'Akıştaki adımlar': 'Steps in the workflow',
  'Akışınızı adım adım oluşturun.': 'Build your workflow step by step.',
  'Alan adı': 'Field name',
  'Alan anahtarı': 'Field key',
  'Alan ekle': 'Add field',
  'Alan geçersiz. Anahtar harf veya alt çizgiyle başlamalı, yalnız harf/rakam/alt çizgi içermeli ve en fazla 64 karakter olmalıdır. Ad boş olamaz (en fazla 120 karakter); değer ve sınırları kontrol edin.':
    'Invalid field. The key must start with a letter or underscore, contain only letters, digits or underscores and be at most 64 characters. The name cannot be empty (max 120 characters); check the values and bounds.',
  'Alan referansları güncellendiğinde belge sınırı aşılıyor; değişiklik uygulanmadı.':
    'Updating the field references would exceed the document limit; the change was not applied.',
  'Alan sınırları geçersiz: alt sınır üst sınırı aşamaz; metin uzunluğu 0–1000 arasında tam sayı olmalıdır.':
    'Invalid field bounds: the minimum cannot exceed the maximum; text length must be an integer between 0 and 1000.',
  'Alan türü': 'Field type',
  'Alan ve koşul ayarı bekliyor': 'Waiting for field and condition settings',
  'Alanları düzenleyip değişiklikleri uygulayın. Uygulanmayan girişler başka bir adım seçilince silinir.':
    'Edit the fields and apply the changes. Unapplied entries are discarded when another step is selected.',
  'Alanı düzenle': 'Edit field',
  'Alanı uygula': 'Apply field',
  'Alt sınır': 'Minimum',
  Açıklama: 'Description',
  'Açıklama en fazla 2000 karakter olabilir.': 'The description can be at most 2000 characters.',
  'A–Z, a–z veya alt çizgiyle başlayın; devamında rakam da kullanabilirsiniz. Anahtar değişince bağlı koşullar güncellenir.':
    'Start with A–Z, a–z or an underscore; digits may follow. Changing the key updates linked conditions.',
  'Bağlantı ekle': 'Add connection',
  'Bağlantı kimliği zaten kullanılıyor.': 'This connection ID is already in use.',
  'Bağlantı kontrol ediliyor…': 'Checking connection…',
  Bağlantılar: 'Connections',
  'Bağlantıyı sil': 'Delete connection',
  'Bağlı koşul yok.': 'No linked conditions.',
  'Bağlı koşullar: {join}': 'Linked conditions: {join}',
  Başlangıç: 'Start',
  'Başlangıç adımına bağlantı kurulamaz.': 'The start step cannot receive connections.',
  'Başlangıç açıklaması (isteğe bağlı)': 'Start description (optional)',
  'Başlangıç tarihi': 'Start date',
  'Belge şemaya uymuyor ({code}).': 'The document does not match the schema ({code}).',
  'Bir adım kendisine bağlanamaz.': 'A step cannot connect to itself.',
  'Bir bağlantı var olmayan bir adıma işaret ediyor; bağlantıyı silin.':
    'A connection points to a missing step; delete the connection.',
  Bitiş: 'End',
  'Bitiş sonucu': 'End outcome',
  'Bu adım için geçerli bir çıkış seçin.': 'Choose a valid output for this step.',
  'Bu akışı düzenle': 'Edit this workflow',
  'Bu alan anahtarı zaten kullanılıyor.': 'This field key is already in use.',
  'Bu alan koşullarda kullanılıyor. Silmeden önce bağlı koşulları düzenleyin.':
    'This field is used in conditions. Edit the linked conditions before deleting it.',
  'Bu alanı kullanan koşulun tür veya değer ayarını kontrol edin.':
    'Check the type or value of the condition that uses this field.',
  'Bu bağlantı bir döngü oluşturur.': 'This connection would create a cycle.',
  'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.':
    'An account with this email already exists. Try signing in.',
  'Bu hesap devre dışı bırakılmış.': 'This account has been disabled.',
  'Bu kimlikle silinmiş bir bulut kaydı var; taslağı yeni kimlikle kaydetmek için dışa/içe aktarın.':
    'A deleted cloud record uses this ID; export and re-import the draft to save it with a new ID.',
  'Bu koşul henüz tanımlı bir alana bağlı değil. Alanı seçip uygulayın.':
    'This condition is not linked to a defined field yet. Choose a field and apply.',
  'Bu sekmedekini kaydet': "Save this tab's version",
  'Bu taslak başka bir sekmede değiştirildi. Otomatik kayıt duraklatıldı; hangi sürümle devam edeceğinizi seçin.':
    'This draft was changed in another tab. Autosave is paused; choose which version to continue with.',
  'Bu taslak henüz buluta kaydedilmedi.': 'This draft has not been saved to the cloud yet.',
  'Bu taslağın bulut sürümü: {known}.': 'Cloud version of this draft: {known}.',
  'Bu çıkış zaten bağlı. Önce mevcut bağlantıyı silin.':
    'This output is already connected. Delete the existing connection first.',
  'Bugün kalan AI hakkı: {count}.': 'AI requests left today: {count}.',
  'Bugünkü AI hakkınızı kullandınız. Yarın (UTC) yeniden deneyebilirsiniz.':
    "You have used today's AI request. You can try again tomorrow (UTC).",
  Bulut: 'Cloud',
  'Bulut hesabı bu sunucuda yapılandırılmadı.': 'Cloud accounts are not configured on this server.',
  'Bulut hesabı yapılandırılmadı': 'Cloud accounts not configured',
  'Bulut kaydı': 'Cloud save',
  'Bulut kaydı bu sunucuda yapılandırılmadı.': 'Cloud saving is not configured on this server.',
  'Bulut kaydı bulunamadı; silinmiş olabilir.':
    'The cloud record was not found; it may have been deleted.',
  'Bulut kaydı onayı': 'Cloud save confirmation',
  'Bulut kaydı tamamlanamadı. Lütfen tekrar deneyin.':
    'The cloud save could not be completed. Please try again.',
  'Bulut sürümleri': 'Cloud versions',
  'Bulut sürümlerini göster': 'Show cloud versions',
  'Bulut çakışması': 'Cloud conflict',
  'Buluta kaydedildi (sürüm {revision}). Yerel taslağınız da duruyor.':
    'Saved to the cloud (version {revision}). Your local draft is kept too.',
  'Buluta kaydet': 'Save to cloud',
  'Buluta kaydetmek için hesap menüsünden e-postanızı doğrulayın.':
    'Verify your email from the account menu to save to the cloud.',
  'Buluta kaydetmek için önce e-postanızı doğrulayın.':
    'Verify your email before saving to the cloud.',
  'Bulutta bu taslağın daha yeni bir sürümü var (sürüm {current}). Kaydederseniz bu tarayıcıdaki hali sürüm {next} olur; eski sürümler silinmez.':
    "The cloud has a newer version of this draft (version {current}). If you save, this browser's copy becomes version {next}; older versions are kept.",
  'Ctrl/Cmd+Shift+Z veya Ctrl+Y': 'Ctrl/Cmd+Shift+Z or Ctrl+Y',
  'Ctrl/Cmd+Z': 'Ctrl/Cmd+Z',
  'Desteklenmeyen şema sürümü; yalnız schemaVersion 1 içe aktarılır.':
    'Unsupported schema version; only schemaVersion 1 can be imported.',
  'Değer alanın seçeneklerinden olmalıdır; “şunlardan biridir” için en az bir seçenek işaretleyin.':
    "The value must be one of the field's options; select at least one option for “is one of”.",
  'Değişiklik bağlı koşulu geçersiz kılıyor. Önce koşulu düzenleyin veya uyumlu bir tür/seçenek seçin.':
    'The change would invalidate a linked condition. Edit the condition first or choose a compatible type/options.',
  'Değişiklik geçersiz: etiket boş olamaz, en fazla 120 karakter olmalıdır; belge limitleri korunmalıdır.':
    'Invalid change: the label cannot be empty and must be at most 120 characters; document limits must be kept.',
  'Değişiklik uygulanmadı: ad ve rol boş olamaz, en fazla 120 karakter olabilir; açıklama en fazla {text} karakter olmalı, bitiş sonucu geçerli olmalıdır.':
    'Change not applied: name and role cannot be empty and may be at most 120 characters; the description may be at most {text} characters and the end outcome must be valid.',
  'Değişiklik yok': 'No changes',
  'Değişiklik: ': 'Change: ',
  'Değişiklikleri uygula': 'Apply changes',
  'Değişiklikleri uygulamadan başka bir alan seçerseniz girişleriniz silinir.':
    'If you select another field without applying, your entries are discarded.',
  Dil: 'Language',
  'Diğer sekmedeki kayıt okunamadı. Bu sekmedeki taslağı kaydedebilirsiniz.':
    "The other tab's save could not be read. You can save this tab's draft.",
  'Diğer sekmedeki sürümü yükle': "Load the other tab's version",
  Donanım: 'Hardware',
  Dosya: 'File',
  'Dosya 256 KiB sınırını aşıyor; okunmadı.':
    'The file exceeds the 256 KiB limit; it was not read.',
  'Dosya Workflow v1 şemasına uymuyor{path}.':
    'The file does not match the Workflow v1 schema{path}.',
  'Dosya geçerli bir JSON belgesi değil.': 'The file is not a valid JSON document.',
  'Dosya işlemleri': 'File actions',
  'Dosya okunamadı.': 'The file could not be read.',
  'Dosya sınırları aşıyor: en fazla 256 KiB, 50 adım, 100 bağlantı ve 30 alan olabilir.':
    'The file exceeds the limits: at most 256 KiB, 50 steps, 100 connections and 30 fields.',
  'Dosyada aynı anahtarı kullanan birden fazla alan var.':
    'The file has several fields with the same key.',
  'Dosyada aynı kimliği kullanan birden fazla adım veya bağlantı var.':
    'The file has several steps or connections with the same ID.',
  'Dosyada {count} doğrulama sorunu var; taslak olarak açılır.':
    'The file has {count} validation issues; it opens as a draft.',
  Doğru: 'True',
  'Doğru / yanlış': 'True / false',
  'Doğru veya yanlış seçin.': 'Choose true or false.',
  Doğrulama: 'Validation',
  'Doğrulama e-postası gönderildi.': 'Verification email sent.',
  'Doğrulama sorunları': 'Validation issues',
  Düzenle: 'Edit',
  'Düzenlemek için tuvalden veya listeden bir adım seçin.':
    'Select a step on the canvas or in the list to edit it.',
  'Düzenlemeyi kilitle veya aç': 'Lock or unlock editing',
  'Düzenlenecek adım bulunamadı.': 'The step to edit was not found.',
  'Düzenlenecek alan bulunamadı.': 'The field to edit was not found.',
  'Düzenlenecek koşul adımı bulunamadı.': 'The condition step to edit was not found.',
  'E-posta': 'Email',
  'E-posta doğrulandı; buluta kayıt açık.': 'Email verified; cloud saving is enabled.',
  'E-posta veya şifre hatalı.': 'Incorrect email or password.',
  'Editöre dön': 'Back to editor',
  'Ekip lideri': 'Team lead',
  'Ekip lideri onayı': 'Team lead approval',
  'Elle kayıt': 'Manual save',
  'En fazla 100 bağlantı eklenebilir.': 'At most 100 connections can be added.',
  'En fazla 30 alan eklenebilir; belge boyutu sınırı da korunmalıdır.':
    'At most 30 fields can be added; the document size limit also applies.',
  'En fazla 50 adım eklenebilir.': 'At most 50 steps can be added.',
  'Fatura kontrolü': 'Invoice check',
  'Fatura var mı': 'Has invoice',
  'Faturasız masraf reddedilir; 2.500 ve üzeri finans onayı ister.':
    'Expenses without an invoice are rejected; 2,500 and above need finance approval.',
  Finans: 'Finance',
  'Finans onayı': 'Finance approval',
  'Firebase hizmetine ulaşılamadı. Bağlantınızı kontrol edin.':
    'Could not reach Firebase. Check your connection.',
  'Firebase projesi bağlanınca hesap özellikleri açılır.':
    'Account features turn on once a Firebase project is connected.',
  'Geliştirme temeli': 'Development foundation',
  'Geri al': 'Undo',
  'Geri yükleme': 'Restore',
  'Geçerli bir e-posta adresi girin.': 'Enter a valid email address.',
  'Geçerli bir takvim tarihi girin.': 'Enter a valid calendar date.',
  Geçmiş: 'History',
  'Girdi değerleri': 'Input values',
  'Giriş alanları': 'Input fields',
  'Giriş yap': 'Sign in',
  'Gün sayısı': 'Number of days',
  Hastalık: 'Sick',
  'Hedef adım': 'Target step',
  Hesap: 'Account',
  'Hesap bilgisi alınamadı. Tekrar giriş yapın.':
    'Account details could not be loaded. Sign in again.',
  'Hesap bilgisi yükleniyor…': 'Loading account details…',
  'Hesap işlemi tamamlanamadı. Lütfen tekrar deneyin.':
    'The account action could not be completed. Please try again.',
  'Hesap oluştur': 'Create account',
  'Kayıt ol': 'Sign up',
  'Hesap:': 'Account:',
  Doğrulanmadı: 'Not verified',
  Kapat: 'Close',
  'Şifreler eşleşmiyor.': 'The passwords do not match.',
  'Şifre sıfırlama': 'Password reset',
  'E-postanı kontrol et': 'Check your email',
  '{email} adresine bir sıfırlama bağlantısı gönderdik.': 'We sent a reset link to {email}.',
  'E-postadaki bağlantıyı aç ve yeni şifreni belirle.':
    'Open the link in the email and set a new password.',
  'Buraya dönüp yeni şifrenle giriş yap.': 'Come back here and sign in with your new password.',
  'E-posta gelmediyse spam klasörüne de bak.':
    'If the email does not arrive, check your spam folder.',
  'Giriş ekranına dön': 'Back to sign in',
  'Ücretsiz hesap': 'Free account',
  'Şifreni mi unuttun?': 'Forgot your password?',
  'Tekrar hoş geldin': 'Welcome back',
  'Hesapla açılanlar': 'What an account unlocks',
  'AI ile akış oluşturma (günde 1 öneri)': 'Create workflows with AI (1 proposal a day)',
  'Akışlarını buluta kaydetme ve sürüm geçmişi': 'Cloud saves with revision history',
  'Tarayıcıdaki taslağın olduğu gibi kalır': 'Your browser draft stays as it is',
  'Hesabının e-posta adresini yaz; sana yeni şifre belirleme bağlantısı gönderelim.':
    'Enter your account email and we will send you a link to set a new password.',
  Gizle: 'Hide',
  Göster: 'Show',
  'Şifre (tekrar)': 'Password (again)',
  'Şifreler eşleşiyor.': 'The passwords match.',
  'Bu e-postayla giriş yap': 'Sign in with this email',
  'Şifreni sıfırla': 'Reset your password',
  'Yeni hesap oluştur': 'Create a new account',
  'Lütfen bekleyin…': 'Please wait…',
  'Sıfırlama bağlantısı gönder': 'Send reset link',
  'Zaten hesabın var mı?': 'Already have an account?',
  'Hesabın yok mu?': 'No account yet?',
  'Son bir adım': 'One last step',
  'E-postanı doğrula': 'Verify your email',
  'Kayıt adımları': 'Sign-up steps',
  'Hesap oluşturuldu': 'Account created',
  'AI ve bulut kaydı açılır': 'AI and cloud saves unlock',
  '{email} adresine bir doğrulama bağlantısı gönderdik.': 'We sent a verification link to {email}.',
  'Gelen kutunu aç; e-posta birkaç dakika içinde gelir, spam klasörüne de bak.':
    'Open your inbox; the email arrives within a few minutes — check spam too.',
  'E-postadaki bağlantıya tıkla.': 'Click the link in the email.',
  'Buraya dönüp “Doğruladım, devam et”e bas.': 'Come back here and press “I verified, continue”.',
  'Henüz doğrulanmamış görünüyor. Bağlantıya tıkladıktan sonra birkaç saniye bekleyip tekrar dene.':
    'It does not look verified yet. After clicking the link, wait a few seconds and try again.',
  'Doğruladım, devam et': 'I verified, continue',
  'Tekrar gönder ({seconds} sn)': 'Resend ({seconds} s)',
  'E-postayı tekrar gönder': 'Resend email',
  'Sonra yaparım': 'Later',
  '“Oluştur” sekmesinde süreci anlat, AI bir akış önersin.':
    'Describe the process in the “Create” tab and let AI propose a workflow.',
  '“Dosya” sekmesinden akışını buluta kaydet.':
    'Save your workflow to the cloud from the “File” tab.',
  'Devam et': 'Continue',
  ' (sağlandı)': ' (met)',
  ' (henüz değil)': ' (not yet)',
  'AI ile oluşturmak için önce e-postanı doğrula.': 'Verify your email first to create with AI.',
  'Doğrulama adımlarını göster': 'Show verification steps',
  'Ücretsiz hesapla günde 1 AI önerisi alırsın.': 'A free account gets 1 AI proposal a day.',
  'Akışlarını buluta kaydetmek ve sürüm geçmişini görmek için giriş yap.':
    'Sign in to save workflows to the cloud and see their revision history.',
  'En az 6 karakter.': 'At least 6 characters.',
  'Şifre en az 6 karakter olmalı.': 'The password must be at least 6 characters.',
  'Hesap oluşturuldu. Doğrulama e-postası gönderildi.': 'Account created. Verification email sent.',
  Hizmet: 'Service',
  'JSON dışa aktar': 'Export JSON',
  'JSON içe aktar': 'Import JSON',
  Karşılaştırma: 'Comparison',
  'Karşılaştırma değeri': 'Comparison value',
  'Karşılaştırma değeri bir sayı olmalıdır.': 'The comparison value must be a number.',
  'Karşılaştırma değerleri': 'Comparison values',
  'Karşılaştırma metni en fazla {max} karakter olabilir.':
    'The comparison text can be at most {max} characters.',
  'Karşılaştırılacak alan': 'Field to compare',
  Kategori: 'Category',
  'Kaydedilecek değişiklik yok': 'No changes to save',
  'Kaydedilemedi: depolama dolu': 'Not saved: storage full',
  Kaydet: 'Save',
  'Kaynak adım': 'Source step',
  'Kaynak ve hedef adımı seçin.': 'Choose the source and target steps.',
  Koşul: 'Condition',
  'Koşul için tanımlı bir giriş alanı seçin.': 'Choose a defined input field for the condition.',
  'Koşul kurmak için önce aşağıdaki “Giriş alanları” bölümünden bir alan ekleyin.':
    'To build a condition, first add a field in the “Input fields” section below.',
  'Koşul sağlanırsa “Doğru”, sağlanmazsa “Yanlış” çıkışı izlenir.':
    'If the condition holds, the “True” output is followed; otherwise “False”.',
  'Koşul uygulanmadı: ad boş olamaz (en fazla 120 karakter); alan, karşılaştırma ve değer geçerli olmalı, belge sınırları korunmalıdır.':
    'Condition not applied: the name cannot be empty (max 120 characters); the field, comparison and value must be valid and document limits kept.',
  'Masraf iadesi': 'Expense reimbursement',
  'Masraf reddedildi': 'Expense rejected',
  'Masraf ödendi': 'Expense paid',
  Mazeret: 'Personal',
  Metin: 'Text',
  Onay: 'Approval',
  'Onay bekleniyor': 'Waiting for approval',
  'Onay kararı': 'Approval decision',
  Onayla: 'Approve',
  Onaylandı: 'Approved',
  'Onaylayan kabul ederse “Onaylandı”, reddederse “Reddedildi” çıkışı izlenir.':
    'If the approver accepts, the “Approved” output is followed; if they reject, “Rejected”.',
  'Onaylayan rolü': 'Approver role',
  'Otomatik kayıt duraklatıldı': 'Autosave paused',
  'Oturum geçersiz. Tekrar giriş yapın.': 'Session invalid. Sign in again.',
  'Oturumun süresi doldu. Tekrar giriş yapın.': 'Your session expired. Sign in again.',
  Reddedildi: 'Rejected',
  Reddet: 'Reject',
  'Satın alma onaylandı': 'Purchase approved',
  'Satın alma reddedildi': 'Purchase rejected',
  'Satın alma talebi': 'Purchase request',
  Sayı: 'Number',
  'Servis bağlantısı': 'Service connection',
  'Servis bağlantısını bu ekrandan kontrol edebilirsiniz.':
    'You can check the service connection on this screen.',
  'Servis durumu': 'Service status',
  'Servis hazır': 'Service ready',
  'Servise ulaşılamadı. Lütfen yeniden deneyin.': 'Could not reach the service. Please try again.',
  'Seçenek listesi': 'Option list',
  'Seçenekler (her satıra bir seçenek)': 'Options (one per line)',
  'Seçilen karşılaştırma bu alan türüyle kullanılamaz.':
    'The selected comparison cannot be used with this field type.',
  Seçilmedi: 'Not selected',
  Sil: 'Delete',
  Simülasyon: 'Simulation',
  'Simülasyon adımları': 'Simulation steps',
  'Simülasyon için önce doğrulama sorunlarını giderin.':
    'Fix the validation issues before simulating.',
  'Simülasyonu başlat': 'Start simulation',
  'Simülasyonu temizle': 'Clear simulation',
  'Soldan bir başlangıç adımı ekleyin.': 'Add a start step from the left.',
  Sonraki: 'Next',
  'Sonuç: akış reddedildi': 'Result: workflow rejected',
  'Sonuç: akış tamamlandı': 'Result: workflow completed',
  'Sunucuya ulaşılamadı. Taslağınız değişmedi.':
    'Could not reach the server. Your draft is unchanged.',
  'Sunucuya ulaşılamadı. Yerel taslağınız korunuyor.':
    'Could not reach the server. Your local draft is kept.',
  'Süre kontrolü': 'Duration check',
  'Süreci anlatın': 'Describe the process',
  'Sürüm {revision}': 'Version {revision}',
  Tamamlandı: 'Completed',
  'Tanımlı alanlar': 'Defined fields',
  'Tarayıcı depolaması dolu olduğu için son değişiklikler kaydedilmedi. Sayfayı yenilerseniz kaybolur.':
    'Browser storage is full, so the latest changes were not saved. They will be lost if you reload.',
  'Tarayıcı depolamasına erişilemiyor; değişiklikler yalnız bu oturumda kalır.':
    'Browser storage is not accessible; changes stay in this session only.',
  'Tarayıcı kaydı kullanılamıyor': 'Browser storage unavailable',
  'Tarayıcıda kaydedildi': 'Saved in browser',
  Tarih: 'Date',
  'Taslak bu tarayıcıda otomatik kaydedilir; eksik adımlar olsa da yenilemede geri gelir. Hesap veya bulut kaydı yoktur.':
    'The draft is saved automatically in this browser and comes back after a reload, even if steps are incomplete. No account or cloud save is involved.',
  'Taslak değişti; düzenleme önerisini yeniden isteyin.':
    'The draft changed; request the edit proposal again.',
  'Taslak öneriden sonra değişti; öneri uygulanmadı. Yeniden isteyin.':
    'The draft changed after the proposal; it was not applied. Request it again.',
  'Taslağa uygula': 'Apply to draft',
  'Taslağı değiştir': 'Replace draft',
  Tutar: 'Amount',
  'Tutar kontrolü': 'Amount check',
  'Tümünü göster': 'Fit view',
  'Uygularsanız değişiklikler taslağa işlenir; “Geri al” ile dönebilirsiniz.':
    'If you apply, the changes are written to the draft; you can revert with “Undo”.',
  'Uygularsanız mevcut taslağın yerine geçer; “Geri al” ile dönebilirsiniz.':
    'If you apply, it replaces the current draft; you can revert with “Undo”.',
  Uzaklaştır: 'Zoom out',
  'Varsayılan değer': 'Default value',
  'Varsayılan değer alan türüne, seçeneklere ve sınırlara uygun olmalıdır.':
    'The default value must match the field type, options and bounds.',
  'Varsayılan değer kullan': 'Use a default value',
  Vazgeç: 'Cancel',
  'WORKFLOW BUILDER': 'WORKFLOW BUILDER',
  'Workflow tasarımı ve simülasyonu için ilk adım.':
    'The first step for designing and simulating workflows.',
  Yakınlaştır: 'Zoom in',
  'Yalnız doğrulama sorunu olmayan akışlar buluta kaydedilebilir.':
    'Only workflows without validation issues can be saved to the cloud.',
  'Yalnız simülasyon: e-posta, onay isteği veya harici işlem gönderilmez; sonuç kaydedilmez.':
    'Simulation only: no emails, approval requests or external actions are sent; results are not stored.',
  'Yalnızca bir başlangıç adımı eklenebilir.': 'Only one start step can be added.',
  Yanlış: 'False',
  Yazılım: 'Software',
  'Yeni akış oluştur': 'Create a new workflow',
  'Yeni iş akışı': 'New workflow',
  'Yeniden başlat': 'Restart',
  'Yeniden kontrol et': 'Check again',
  'Yine de kaydet': 'Save anyway',
  Yinele: 'Redo',
  Yönetici: 'Manager',
  'Yönetici onayı': 'Manager approval',
  Yıllık: 'Annual',
  'Zorunlu alan': 'Required field',
  'bağlantı +{length}/−{length1}': 'connections +{length}/−{length1}',
  'başlık/açıklama değişti': 'title/description changed',
  'büyük veya eşittir': 'is greater than or equal to',
  büyüktür: 'is greater than',
  'eşit değildir': 'is not equal to',
  eşittir: 'equals',
  içerir: 'contains',
  koşul: 'condition',
  'küçük veya eşittir': 'is less than or equal to',
  küçüktür: 'is less than',
  'mevcut taslağın yerine geçecek. Bu oturumda “Geri al” ile dönebilirsiniz; kalıcı yedek için önce dışa aktarın.':
    'will replace the current draft. You can revert with “Undo” in this session; export first for a lasting backup.',
  sonrasındadır: 'is after',
  '{count} / {max} alan · Koşullarda kullanılacak bilgileri tanımlayın.':
    '{count} / {max} fields · Define the information used in conditions.',
  '{count} sorun': '{count} issues',
  '{count} sorun · Taslak kaydedilir, ancak sorunlar giderilmeden çalıştırılamaz. İlgili adımı seçmek için bir soruna tıklayın.':
    '{count} issues · The draft is saved, but it cannot run until they are fixed. Click an issue to select its step.',
  '{fileName} içe aktarıldı.': '{fileName} imported.',
  '{handle} bağlantısı': '{handle} connection',
  '{kind} adımı': '{kind} step',
  '{kind} ekle': 'Add {kind}',
  '{label} alanını düzenle': 'Edit field {label}',
  '{label} alanını sil': 'Delete field {label}',
  '{length} / {max}. Öneri onaylamadan taslağınızı değiştirmez.':
    '{length} / {max}. A proposal never changes your draft without your approval.',
  '{length} adım değişti': '{length} steps changed',
  '{name} adımı {role} kararını bekliyor.': '{name} is waiting for the {role} decision.',
  '{name} akışta tanımlı bir alan değil.': '{name} is not a field defined in the workflow.',
  '{name} başladı.': '{name} started.',
  '{name} bitişine ulaşıldı: akış reddedildi.': 'Reached end {name}: the workflow was rejected.',
  '{name} bitişine ulaşıldı: akış tamamlandı.': 'Reached end {name}: the workflow completed.',
  '{name} değeri alan türüne veya seçeneklerine uymuyor.':
    'The value of {name} does not match the field type or options.',
  '{name} değeri alanın alt/üst sınırları dışında.':
    "The value of {name} is outside the field's bounds.",
  '{name} için bir değer girin; alan zorunlu veya bir koşulda kullanılıyor.':
    'Enter a value for {name}; the field is required or used in a condition.',
  '{name}: {summary}{value} → {result}.': '{name}: {summary}{value} → {result}.',
  '{nodes} / 50 adım · {edges} / 100 bağlantı': '{nodes} / 50 steps · {edges} / 100 connections',
  '{nodes} adım · {edges} bağlantı · {inputs} alan':
    '{nodes} steps · {edges} connections · {inputs} fields',
  '{step} adımı bir döngünün parçası; akış sonsuza kadar sürebilir.':
    'Step {step} is part of a cycle; the workflow could run forever.',
  '{step} adımına başlangıçtan ulaşılamıyor.': 'Step {step} cannot be reached from the start.',
  '{step} adımında bu türe ait olmayan {handle} çıkışı kullanılmış.':
    'Step {step} uses the {handle} output, which does not belong to its type.',
  '{step} adımından sonraki her yol bir bitiş adımına varmıyor.':
    'Not every path after step {step} reaches an end step.',
  '{step} adımının {handle} çıkışı bağlı değil.':
    'The {handle} output of step {step} is not connected.',
  '{step} adımının {handle} çıkışında birden fazla bağlantı var.':
    'The {handle} output of step {step} has more than one connection.',
  '{step} başlangıç adımına bağlantı gelemez.': 'Start step {step} cannot receive connections.',
  '{step} bitiş adımından bağlantı çıkamaz.': 'End step {step} cannot have outgoing connections.',
  '{step} koşulu tanımlı bir giriş alanına bağlı değil.':
    'Condition {step} is not linked to a defined input field.',
  '{step} koşulundaki karşılaştırma alan türüyle kullanılamaz.':
    'The comparison in condition {step} cannot be used with the field type.',
  '{step} koşulunun değeri alan türüne veya seçeneklerine uymuyor.':
    'The value of condition {step} does not match the field type or options.',
  'Çok fazla deneme yapıldı. Bir süre sonra tekrar deneyin.': 'Too many attempts. Try again later.',
  Çıkış: 'Output',
  'Çıkış noktalarını sürükleyerek bağlayın': 'Drag the output handles to connect',
  'Çıkış yap': 'Sign out',
  'Çıkış yapmak bu tarayıcıdaki yerel taslağı silmez.':
    'Signing out does not delete the local draft in this browser.',
  'Çıkış yapıldı. Yerel taslağınız bu tarayıcıda kalır.':
    'Signed out. Your local draft stays in this browser.',
  Çıkışlar: 'Outputs',
  'Önce kaynak seçin': 'Choose a source first',
  'Önceki taslak okunamadı. Yedeklendi ve boş bir taslakla başlandı.':
    'The previous draft could not be read. It was backed up and an empty draft was started.',
  'Önceki taslak okunamadı. Yedeklenemedi; boş bir taslakla başlandı.':
    'The previous draft could not be read or backed up; an empty draft was started.',
  'Öneri hazırlanıyor…': 'Preparing proposal…',
  'Öneri reddedildi; taslağınız değişmedi.': 'Proposal rejected; your draft is unchanged.',
  'Önerilen adımlar': 'Proposed steps',
  'Örn. 10.000 TL üzeri satın almalar yönetici onayına gitsin.':
    'E.g. purchases above 10,000 should go to manager approval.',
  'Örnek yükleme onayı': 'Example load confirmation',
  'Örnekten başla': 'Start from an example',
  'Örneği yükle': 'Load example',
  Özellikler: 'Properties',
  'Üst sınır': 'Maximum',
  öncesindedir: 'is before',
  'örneği mevcut taslağın yerine geçecek. Bu oturumda “Geri al” ile dönebilirsiniz.':
    'example will replace the current draft. You can revert with “Undo” in this session.',
  'İK onayı': 'HR approval',
  'İlk adımla başlayın': 'Start with the first step',
  'İnsan kaynakları': 'Human resources',
  'İstediğiniz değişikliği anlatın': 'Describe the change you want',
  'İsteğe bağlı': 'Optional',
  'İzin onaylandı': 'Leave approved',
  'İzin reddedildi': 'Leave rejected',
  'İzin talebi': 'Leave request',
  'İzin türü': 'Leave type',
  'İçe aktarma': 'Import',
  'İçe aktarma onayı': 'Import confirmation',
  'İçe aktarılamadı: {error}': 'Import failed: {error}',
  'İçerik özeti eklenince belge 256 KiB sınırını aşıyor.':
    'With the content hash added the document exceeds 256 KiB.',
  'İçerik özeti eşleşmiyor; dosya elle değiştirilmiş olabilir. Özet yeniden hesaplanacak.':
    'The content hash does not match; the file may have been edited by hand. The hash will be recalculated.',
  'İş akışı tasarımı': 'Workflow design',
  'İş akışı tuvali': 'Workflow canvas',
  Şifre: 'Password',
  'Şifre en az 6 karakter olmalıdır.': 'The password must be at least 6 characters.',
  'Şifre girin.': 'Enter a password.',
  'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.':
    'A password reset link was sent to your email.',
  'Şifremi unuttum': 'Forgot password',
  "Şifreniz yalnızca Firebase Authentication'a gönderilir.":
    'Your password is sent only to Firebase Authentication.',
  'şunlardan biridir': 'is one of',
  '“{label}” — {role} olarak karar verin.': '“{label}” — decide as {role}.',
  '“{title}” hesabınıza kopya olarak kaydedilecek. Yerel taslak silinmez.':
    '“{title}” will be saved to your account as a copy. The local draft is not deleted.',
  '“{title}” yeni bir bulut sürümü olarak kaydedilecek. Yerel taslak silinmez.':
    '“{title}” will be saved as a new cloud version. The local draft is not deleted.',
  '−{length} adım': '−{length} steps',
  '▶ Simülasyon burada': '▶ Simulation is here',
};
