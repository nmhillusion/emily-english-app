import { Lesson } from './lesson';
export const FALLBACK_LESSON: Lesson = {
  topic_emoji: '🐶',
  vocab: [
    { word: 'Dog', phonetics: '/dɒɡ/', meaning: 'Con chó', emoji: '🐶', tip: 'Bé tròn miệng đọc âm o thật mạnh, rồi chạm đầu lưỡi lên nướu đọc âm g nhé!' },
    { word: 'Cat', phonetics: '/kæt/', meaning: 'Con mèo', emoji: '🐱', tip: 'Bé mở miệng rộng đọc âm a thật to, rồi chạm lưỡi lên nướu đọc âm t nhé!' },
    { word: 'Rabbit', phonetics: '/ˈræb.ɪt/', meaning: 'Con thỏ', emoji: '🐰', tip: 'Bé cong nhẹ đầu lưỡi đọc âm r, rồi mím môi đọc âm b thật rõ nhé!' }
  ],
  story: {
    title: 'Chú Chó Và Những Người Bạn Nhỏ',
    full_english: 'I have a cute dog named Max. My dog likes to play with a fluffy cat in the garden. Today, they see a small rabbit hiding near the flowers.',
    full_vietnamese: 'Tôi có một chú chó đáng yêu tên là Max. Chú chó của tôi thích chơi với một chú mèo xù lông trong vườn. Hôm nay, chúng nhìn thấy một chú thỏ nhỏ đang trốn gần những bông hoa.',
    english: ['I have a cute dog named Max.', 'My dog likes to play with a fluffy cat in the garden.', 'Today, they see a small rabbit hiding near the flowers.'],
    vietnamese: ['Tôi có một chú chó đáng yêu tên là Max.', 'Chú chó của tôi thích chơi với một chú mèo xù lông trong vườn.', 'Hôm nay, chúng nhìn thấy một chú thỏ nhỏ đang trốn gần những bông hoa.'],
    notes: ['Cả câu nghĩa là "Tôi có một chú chó đáng yêu tên là Max". Cấu trúc "I have..." dùng để nói về thứ mình sở hữu. Khi đọc, nhấn mạnh vào từ "cute" và tên "Max" nhé.',
      'Cả câu nghĩa là "Chú chó của tôi thích chơi với một chú mèo xù lông trong vườn". Cụm "likes to play with" nghĩa là "thích chơi với". Khi đọc, nối âm "play_with" liền mạch và nhấn vào từ "fluffy" nhé.',
      'Cả câu nghĩa là "Hôm nay, chúng nhìn thấy một chú thỏ nhỏ đang trốn gần những bông hoa". "They see" nghĩa là "chúng nhìn thấy". Khi đọc, ngắt nghỉ nhẹ sau "Today," rồi đọc phần còn lại liền mạch nhé.']
  },
  quiz: [
    { question: "Từ nào trong tiếng Anh có nghĩa là 'Con chó'?", options: ['Cat', 'Dog', 'Rabbit'], correct: 1, hint: 'Bé nhớ lại từ đầu tiên cô dạy nhé!', explanation: "'Dog' nghĩa là con chó. 'Cat' là con mèo còn 'Rabbit' là con thỏ bé nhé!", aboutStory: false },
    { question: 'Chú chó trong câu chuyện tên là gì?', options: ['Max', 'Tom', 'Bob'], correct: 0, hint: 'Cô có nhắc tên bạn ấy ngay ở câu đầu tiên đó!', explanation: 'Câu đầu tiên nói "a cute dog named Max" — chú chó tên là Max bé nhé!', aboutStory: true },
    { question: "'Cat' nghĩa là con gì?", options: ['Con thỏ', 'Con mèo', 'Con chó'], correct: 1, hint: 'Bạn ấy kêu "meo meo" đó bé!', explanation: "'Cat' là con mèo. Con thỏ là 'Rabbit' nha bé.", aboutStory: false },
    { question: 'Hai bạn chó và mèo chơi với nhau ở đâu?', options: ['Trong vườn', 'Trên biển', 'Ở trường'], correct: 0, hint: 'Nơi đó có nhiều bông hoa xinh lắm!', explanation: '"in the garden" nghĩa là "trong vườn" bé nhé.', aboutStory: true },
    { question: 'Cuối truyện, các bạn nhìn thấy con gì?', options: ['Một chú chim', 'Một chú thỏ nhỏ', 'Một chú cá'], correct: 1, hint: 'Bạn ấy có đôi tai dài và đang trốn gần bông hoa!', explanation: '"a small rabbit" nghĩa là "một chú thỏ nhỏ" đó bé.', aboutStory: true }
  ]
};
