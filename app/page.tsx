import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <main 
      className="min-h-screen p-4 flex items-center justify-center"
      style={{
        backgroundImage: `url('/forestbg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background overlay for better contrast */}
      <div className="absolute inset-0 bg-green-900/20"></div>
      
      {/* Content */}
      <div className="relative z-10 w-full flex items-center justify-center">
        {/* Personagem apontando */}
        <div className="hidden lg:block absolute left-2 z-20">
          <div className="relative">
            <img
              src="/pointing.png"
              alt="Personagem apontando para o chat"
              className="w-[700px] h-[700px] xl:w-[900px] xl:h-[900px] drop-shadow-2xl transition-transform duration-300"
              style={{
                filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.4))'
              }}
            />
          </div>
        </div>
        
        <ChatInterface />
      </div>
    </main>
  );
}
